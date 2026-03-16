const KnowledgeBase = require('./knowledge-base');
const OpenRouterClient = require('./openrouter-client');
const QualityControl = require('./quality-control');

/**
 * Enhanced Agent Wrapper
 * Интегрирует Knowledge Base в стандартный CashClaw агент
 */

class EnhancedAgent {
  constructor(agentConfig) {
    this.config = agentConfig;
    this.kb = new KnowledgeBase(`./agents/${agentConfig.name}/.knowledge.json`);
    this.llm = new OpenRouterClient(process.env.OPENROUTER_API_KEY, {
      defaultModel: agentConfig.llm.model,
      autoRoute: agentConfig.llm.autoRoute
    });
    this.qc = new QualityControl(this.llm);
  }

  // ============================================
  // EXECUTE TASK WITH KNOWLEDGE BASE
  // ============================================
  
  async executeTask(task) {
    console.log(`🎯 Executing task: ${task.id}`);

    // 1. Найти похожие успешные работы
    const similarWorks = this.kb.findSimilar(task, 3);
    
    let prompt = this.buildPrompt(task);
    
    // 2. Добавить примеры успешных работ в промпт
    if (similarWorks.length > 0) {
      console.log(`📚 Found ${similarWorks.length} similar successful works`);
      
      prompt += `\n\n---\n\nHere are examples of similar high-quality work (${similarWorks[0].rating}★ rated):\n\n`;
      
      similarWorks.forEach((work, i) => {
        prompt += `Example ${i+1}:\n`;
        prompt += `Task: ${work.description}\n`;
        prompt += `Result (excerpt): ${work.work.substring(0, 800)}...\n\n`;
      });
      
      prompt += `Now complete the current task with similar or better quality.`;
    }

    // 3. Выполнить задачу
    console.log('🤖 Generating work...');
    const response = await this.llm.chat([
      { role: 'user', content: prompt }
    ], {
      temperature: this.config.llm.temperature,
      maxTokens: this.config.llm.maxTokens
    });

    const work = response.content;
    console.log(`✅ Work generated (${work.length} chars)`);

    // 4. Quality control
    console.log('🔍 Running quality control...');
    const qcDecision = await this.qc.shouldSubmit(task, work, this.config.qualityControl);

    if (!qcDecision.submit) {
      console.log(`❌ Quality check failed: ${qcDecision.reason}`);
      
      if (qcDecision.reason === 'needs_revision') {
        console.log('🔧 Attempting revision...');
        return await this.reviseWork(task, work, qcDecision.feedback);
      }
      
      return { success: false, reason: qcDecision.reason };
    }

    console.log(`✅ Quality check passed (score: ${qcDecision.review.score}/10)`);

    return {
      success: true,
      work: work,
      qualityScore: qcDecision.review.score,
      cost: response.cost
    };
  }

  // ============================================
  // REVISE WORK BASED ON FEEDBACK
  // ============================================
  
  async reviseWork(task, originalWork, feedback) {
    console.log('🔧 Revising work based on feedback...');

    const revisionPrompt = `
You previously completed this task:

TASK:
${task.description}

YOUR WORK:
${originalWork}

FEEDBACK:
${feedback}

Please revise your work to address the feedback. Maintain the same structure but improve the issues mentioned.
`;

    const response = await this.llm.chat([
      { role: 'user', content: revisionPrompt }
    ], {
      temperature: this.config.llm.temperature * 0.8, // Slightly lower for revision
      maxTokens: this.config.llm.maxTokens
    });

    const revisedWork = response.content;
    console.log('✅ Revision completed');

    // Final quality check
    const qcDecision = await this.qc.shouldSubmit(task, revisedWork, {
      ...this.config.qualityControl,
      externalReview: false // Skip external review for revision
    });

    if (!qcDecision.submit) {
      console.log('❌ Revision still not good enough - declining task');
      return { success: false, reason: 'revision_failed' };
    }

    return {
      success: true,
      work: revisedWork,
      qualityScore: qcDecision.review.score,
      cost: response.cost,
      revised: true
    };
  }

  // ============================================
  // SAVE SUCCESSFUL WORK TO KNOWLEDGE BASE
  // ============================================
  
  async onTaskCompleted(task, work, rating) {
    console.log(`📊 Task completed with rating: ${rating}★`);

    // Add to knowledge base if high quality
    if (rating >= 4.5) {
      this.kb.addSuccessfulWork(task, work, rating);
      console.log('📚 Added to knowledge base');
    }

    return true;
  }

  // ============================================
  // GENERATE QUOTE WITH KNOWLEDGE BASE
  // ============================================
  
  async generateQuote(task, evaluation) {
    console.log('💬 Generating quote...');

    // Get best quotes for this category
    const bestQuotes = this.kb.getBestQuotes(task.category, 3);
    
    let prompt = this.buildQuotePrompt(task, evaluation);
    
    if (bestQuotes.length > 0) {
      console.log(`📚 Found ${bestQuotes.length} winning quote examples`);
      
      prompt += `\n\nHere are examples of quotes that won similar tasks:\n\n`;
      
      bestQuotes.forEach((q, i) => {
        prompt += `Example ${i+1} (won at ${q.price.toFixed(4)} ETH with ${q.competitors} competitors):\n`;
        prompt += `"${q.quote}"\n\n`;
      });
      
      prompt += `Create a quote in similar style but personalized for this task.`;
    }

    const response = await this.llm.chat([
      { role: 'user', content: prompt }
    ], {
      temperature: 0.7,
      maxTokens: 500
    });

    return {
      message: response.content,
      price: evaluation.recommendedPrice,
      strategy: evaluation.strategy
    };
  }

  // ============================================
  // SAVE WINNING QUOTE TO KNOWLEDGE BASE
  // ============================================
  
  async onQuoteWon(task, quote) {
    console.log('🎉 Quote won!');
    
    this.kb.addWinningQuote(task, quote, true);
    console.log('📚 Winning quote saved to knowledge base');
    
    return true;
  }

  // ============================================
  // HELPER: BUILD PROMPTS
  // ============================================
  
  buildPrompt(task) {
    const PROMPTS = require('./prompts');
    
    // Select appropriate prompt based on category
    let template = PROMPTS.blogPost; // default
    
    if (task.category === 'code review') {
      template = PROMPTS.codeReview;
    } else if (task.category === 'research') {
      template = PROMPTS.research;
    }

    return template
      .replace('{requirements}', task.description)
      .replace('{code}', task.code || '')
      .replace('{topic}', task.title || task.description);
  }

  buildQuotePrompt(task, evaluation) {
    const PROMPTS = require('./prompts');
    
    return PROMPTS.quoteMessage
      .replace('{task}', JSON.stringify(task, null, 2))
      .replace('{specialty}', this.config.specialties[0])
      .replace('{rating}', '0') // TODO: get from stats
      .replace('{completed}', '0') // TODO: get from stats
      .replace('{successRate}', '100') // TODO: calculate
      .replace('{price}', evaluation.recommendedPrice.toFixed(4))
      .replace('{delivery}', this.estimateDeliveryTime(task))
      .replace('{strategy}', evaluation.strategy);
  }

  estimateDeliveryTime(task) {
    // Simple estimation based on task length
    const descLength = (task.description || '').length;
    
    if (descLength < 200) return '4-8 hours';
    if (descLength < 500) return '12-24 hours';
    return '1-2 days';
  }
}

module.exports = EnhancedAgent;
