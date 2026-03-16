const fs = require('fs');
const path = require('path');

class BiddingEngine {
  constructor(agentConfig, strategiesConfig) {
    this.agent = agentConfig;
    this.strategies = strategiesConfig.strategies;
    this.quoteStyles = strategiesConfig.quoteStyles;
    this.analytics = this.loadAnalytics();
  }

  loadAnalytics() {
    const analyticsPath = path.join(__dirname, '../analytics/stats.json');
    try {
      return JSON.parse(fs.readFileSync(analyticsPath, 'utf8'));
    } catch (error) {
      return {
        quotesSubmitted: 0,
        tasksWon: 0,
        tasksLost: 0,
        byStrategy: {},
        byCategory: {}
      };
    }
  }

  saveAnalytics() {
    const analyticsPath = path.join(__dirname, '../analytics/stats.json');
    fs.writeFileSync(analyticsPath, JSON.stringify(this.analytics, null, 2));
  }

  async evaluateTask(task) {
    // 1. Check specialty match
    const specialtyMatch = this.matchesSpecialty(task);
    if (!specialtyMatch) {
      return {
        shouldBid: false,
        reason: 'specialty_mismatch',
        details: `Task requires: ${task.tags}, Agent has: ${this.agent.specialties}`
      };
    }

    // 2. Check profitability
    const profitability = this.calculateProfitability(task);
    if (profitability < this.agent.bidding.minProfitMargin) {
      return {
        shouldBid: false,
        reason: 'low_profit',
        details: `Profit margin ${profitability.toFixed(2)}x < required ${this.agent.bidding.minProfitMargin}x`
      };
    }

    // 3. Check competition
    const competitorCount = task.quotesCount || 0;
    if (competitorCount > this.agent.bidding.maxCompetitors) {
      return {
        shouldBid: false,
        reason: 'high_competition',
        details: `${competitorCount} competitors > max ${this.agent.bidding.maxCompetitors}`
      };
    }

    // 4. Estimate win probability
    const winProbability = this.estimateWinProbability(task);
    if (winProbability < 0.2) {
      return {
        shouldBid: false,
        reason: 'low_win_chance',
        details: `Win probability ${(winProbability * 100).toFixed(1)}% < 20%`
      };
    }

    // 5. Calculate optimal price
    const recommendedPrice = this.calculateOptimalPrice(task);

    // 6. Select strategy
    const strategy = this.selectStrategy(task);

    return {
      shouldBid: true,
      winProbability,
      profitability,
      recommendedPrice,
      strategy,
      competitorCount,
      estimatedCost: this.estimateCost(task),
      estimatedProfit: recommendedPrice - this.estimateCost(task)
    };
  }

  matchesSpecialty(task) {
    const taskTags = (task.tags || []).map(t => t.toLowerCase());
    const taskDesc = (task.description || '').toLowerCase();
    const taskCategory = (task.category || '').toLowerCase();

    return this.agent.specialties.some(specialty => {
      const specLower = specialty.toLowerCase();
      return (
        taskTags.includes(specLower) ||
        taskDesc.includes(specLower) ||
        taskCategory.includes(specLower)
      );
    });
  }

  calculateProfitability(task) {
    const estimatedCost = this.estimateCost(task);
    const taskBudget = task.budget || this.estimateMarketPrice(task);
    
    return taskBudget / estimatedCost;
  }

  estimateCost(task) {
    // Estimate based on task complexity
    const complexity = this.estimateComplexity(task);
    
    // Base API cost estimates (in ETH)
    const baseCosts = {
      1: 0.0003,  // Very simple
      2: 0.0005,
      3: 0.0008,
      4: 0.0012,
      5: 0.0018,  // Medium
      6: 0.0025,
      7: 0.0035,
      8: 0.0050,
      9: 0.0070,
      10: 0.0100  // Very complex
    };

    return baseCosts[complexity] || 0.002;
  }

  estimateComplexity(task) {
    const description = (task.description || '').toLowerCase();
    let complexity = 3; // Default medium

    // Simple indicators
    const simpleKeywords = ['simple', 'basic', 'quick', 'short'];
    if (simpleKeywords.some(kw => description.includes(kw))) {
      complexity -= 2;
    }

    // Complex indicators
    const complexKeywords = ['complex', 'advanced', 'detailed', 'comprehensive', 'thorough'];
    if (complexKeywords.some(kw => description.includes(kw))) {
      complexity += 2;
    }

    // Length-based
    if (description.length < 100) complexity -= 1;
    if (description.length > 500) complexity += 1;

    return Math.max(1, Math.min(10, complexity));
  }

  estimateMarketPrice(task) {
    const complexity = this.estimateComplexity(task);
    const category = task.category || 'general';

    // Base prices by category (in ETH)
    const basePrices = {
      'content writing': 0.01,
      'code review': 0.02,
      'typescript': 0.025,
      'research': 0.015,
      'general': 0.012
    };

    const basePrice = basePrices[category.toLowerCase()] || 0.012;
    const complexityMultiplier = 0.5 + (complexity / 10);

    return basePrice * complexityMultiplier;
  }

  estimateWinProbability(task) {
    let probability = 0.5; // Base 50%

    // Agent rating factor
    const agentRating = this.getAgentRating();
    if (agentRating === 0) {
      probability *= 0.4; // -60% for new agents
    } else if (agentRating >= 4.5) {
      probability *= 1.5; // +50% for top agents
    } else if (agentRating >= 3.5) {
      probability *= 1.2; // +20% for good agents
    }

    // Competition factor
    const competitorCount = task.quotesCount || 0;
    if (competitorCount === 0) {
      probability *= 1.3;
    } else if (competitorCount < 3) {
      probability *= 1.1;
    } else if (competitorCount > 7) {
      probability *= 0.7;
    }

    // Specialty match factor
    const exactMatch = this.agent.specialties.some(s => 
      task.tags?.includes(s) || task.category === s
    );
    if (exactMatch) {
      probability *= 1.3;
    }

    // Response time factor
    const taskAge = Date.now() - (task.createdAt || Date.now());
    const taskAgeMinutes = taskAge / (1000 * 60);
    if (taskAgeMinutes < 5) {
      probability *= 1.2; // Early bird bonus
    }

    return Math.min(0.95, Math.max(0.05, probability));
  }

  getAgentRating() {
    // This should come from agent stats
    // For now, return 0 for new agents
    return 0;
  }

  selectStrategy(task) {
    const agentStats = this.getAgentStats();
    const competitorCount = task.quotesCount || 0;

    // Cold start for new agents
    if (agentStats.completed < 10) {
      return 'cold_start';
    }

    // Premium for high-rated agents
    if (agentStats.rating >= 4.5) {
      return 'premium';
    }

    // Aggressive for high competition
    if (competitorCount > 7) {
      return 'aggressive';
    }

    // Default competitive
    return this.agent.pricing.strategy || 'competitive';
  }

  getAgentStats() {
    return {
      completed: 0,
      rating: 0,
      successRate: 0
    };
  }

  calculateOptimalPrice(task) {
    const strategy = this.selectStrategy(task);
    const strategyConfig = this.strategies[strategy];
    
    const basePrice = task.budget || this.estimateMarketPrice(task);
    const multiplier = strategyConfig.priceMultiplier;
    
    let finalPrice = basePrice * multiplier;

    // Ensure minimum profitability
    const minPrice = this.estimateCost(task) * this.agent.bidding.minProfitMargin;
    finalPrice = Math.max(finalPrice, minPrice);

    // Respect agent's price limits
    finalPrice = Math.max(this.agent.pricing.minPrice, finalPrice);
    finalPrice = Math.min(this.agent.pricing.maxPrice, finalPrice);

    return parseFloat(finalPrice.toFixed(4));
  }

  async generateQuoteMessage(task, evaluation) {
    const strategy = this.strategies[evaluation.strategy];
    const styleTemplate = this.quoteStyles[strategy.quoteStyle];
    
    const agentStats = this.getAgentStats();
    
    const message = styleTemplate.template
      .replace('{specialty}', this.agent.specialties[0])
      .replace('{specialties}', this.agent.specialties.map(s => `- ${s}`).join('\n'))
      .replace('{category}', task.category || 'this')
      .replace('{rating}', agentStats.rating.toFixed(1))
      .replace('{completedTasks}', agentStats.completed)
      .replace('{successRate}', (agentStats.successRate * 100).toFixed(0))
      .replace('{price}', evaluation.recommendedPrice.toFixed(4))
      .replace('{time}', this.estimateDeliveryTime(task))
      .replace('{deliverables}', this.generateDeliverables(task))
      .replace('{socialProof}', this.generateSocialProof(task))
      .replace('{expertise}', this.agent.specialties.slice(0, 3).join(', '))
      .replace('{portfolioLink}', '');

    return message;
  }

  estimateDeliveryTime(task) {
    const complexity = this.estimateComplexity(task);
    
    const timeEstimates = {
      1: '2-4 hours',
      2: '4-6 hours',
      3: '6-12 hours',
      4: '12-24 hours',
      5: '1-2 days',
      6: '2-3 days',
      7: '3-5 days',
      8: '5-7 days',
      9: '1-2 weeks',
      10: '2+ weeks'
    };

    return timeEstimates[complexity] || '1-2 days';
  }

  generateDeliverables(task) {
    // Parse task description for deliverables
    // This is a simple version - can be enhanced with LLM
    const category = (task.category || '').toLowerCase();
    
    const deliverableTemplates = {
      'content writing': [
        'Well-researched, original content',
        'SEO-optimized text',
        'Proper formatting and structure',
        '1 round of revisions included'
      ],
      'code review': [
        'Line-by-line code analysis',
        'Performance optimization suggestions',
        'Security vulnerability check',
        'Best practices recommendations'
      ],
      'typescript': [
        'Clean, type-safe TypeScript code',
        'Comprehensive documentation',
        'Unit tests included',
        'Code quality validation'
      ],
      'research': [
        'Comprehensive research report',
        'Cited sources and references',
        'Data analysis and insights',
        'Executive summary'
      ]
    };

    const deliverables = deliverableTemplates[category] || [
      'High-quality work',
      'Timely delivery',
      'Professional results',
      'Revision support'
    ];

    return deliverables.map(d => `✓ ${d}`).join('\n');
  }

  generateSocialProof(task) {
    const agentStats = this.getAgentStats();
    
    if (agentStats.completed === 0) {
      return 'New to the platform but highly experienced in my specialty.';
    }

    return `${agentStats.completed} similar tasks completed with ${agentStats.rating.toFixed(1)}★ average rating.`;
  }

  async generateQuote(task, evaluation) {
    const message = await this.generateQuoteMessage(task, evaluation);

    return {
      price: evaluation.recommendedPrice,
      message: message,
      strategy: evaluation.strategy,
      estimatedDelivery: this.estimateDeliveryTime(task),
      metadata: {
        profitability: evaluation.profitability,
        winProbability: evaluation.winProbability,
        estimatedCost: evaluation.estimatedCost,
        estimatedProfit: evaluation.estimatedProfit
      }
    };
  }

  trackQuote(taskId, quote, task) {
    this.analytics.quotesSubmitted++;
    
    const category = task.category || 'unknown';
    if (!this.analytics.byCategory[category]) {
      this.analytics.byCategory[category] = { quotes: 0, wins: 0 };
    }
    this.analytics.byCategory[category].quotes++;

    const strategy = quote.strategy;
    if (!this.analytics.byStrategy[strategy]) {
      this.analytics.byStrategy[strategy] = { quotes: 0, wins: 0 };
    }
    this.analytics.byStrategy[strategy].quotes++;

    this.saveAnalytics();
  }

  trackWin(taskId, quote, task) {
    this.analytics.tasksWon++;

    const category = task.category || 'unknown';
    if (this.analytics.byCategory[category]) {
      this.analytics.byCategory[category].wins++;
    }

    const strategy = quote.strategy;
    if (this.analytics.byStrategy[strategy]) {
      this.analytics.byStrategy[strategy].wins++;
    }

    this.saveAnalytics();
    this.optimizeStrategies();
  }

  trackLoss(taskId, quote, task) {
    this.analytics.tasksLost++;
    this.saveAnalytics();
  }

  getWinRate() {
    const total = this.analytics.quotesSubmitted;
    if (total === 0) return 0;
    return (this.analytics.tasksWon / total) * 100;
  }

  getWinRateByStrategy(strategy) {
    const stats = this.analytics.byStrategy[strategy];
    if (!stats || stats.quotes === 0) return 0;
    return (stats.wins / stats.quotes) * 100;
  }

  optimizeStrategies() {
    // Auto-optimize after collecting enough data
    const minSampleSize = 20;
    
    if (this.analytics.quotesSubmitted < minSampleSize) {
      return; // Not enough data yet
    }

    for (const [strategyName, stats] of Object.entries(this.analytics.byStrategy)) {
      if (stats.quotes < 5) continue; // Skip strategies with too few samples

      const winRate = stats.wins / stats.quotes;
      const strategy = this.strategies[strategyName];

      if (!strategy) continue;

      // Adjust price multiplier based on win rate
      if (winRate < 0.3) {
        // Win rate too low - make more competitive
        strategy.priceMultiplier *= 0.95;
        console.log(`📉 ${strategyName}: Win rate ${(winRate * 100).toFixed(1)}% too low, lowering price multiplier to ${strategy.priceMultiplier.toFixed(2)}`);
      } else if (winRate > 0.7) {
        // Win rate high - can increase prices
        strategy.priceMultiplier *= 1.05;
        console.log(`📈 ${strategyName}: Win rate ${(winRate * 100).toFixed(1)}% high, raising price multiplier to ${strategy.priceMultiplier.toFixed(2)}`);
      }

      // Keep multiplier in reasonable range
      strategy.priceMultiplier = Math.max(0.5, Math.min(1.5, strategy.priceMultiplier));
    }

    // Save optimized strategies
    this.saveStrategies();
  }

  saveStrategies() {
    const configPath = path.join(__dirname, '../config/bidding-strategies.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.strategies = this.strategies;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  getAnalytics() {
    return {
      ...this.analytics,
      winRate: this.getWinRate(),
      byStrategy: Object.entries(this.analytics.byStrategy).map(([name, stats]) => ({
        name,
        ...stats,
        winRate: stats.quotes > 0 ? (stats.wins / stats.quotes) * 100 : 0
      }))
    };
  }
}

module.exports = BiddingEngine;
