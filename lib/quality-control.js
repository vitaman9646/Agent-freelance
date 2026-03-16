const OpenRouterClient = require('./openrouter-client');

class QualityControl {
  constructor(llmClient) {
    this.llm = llmClient;
  }

  async selfReview(task, result) {
    const prompt = `
You have just completed a task. Review your own work critically.

TASK DESCRIPTION:
${task.description}

YOUR WORK:
${result}

EVALUATION CHECKLIST:
□ All requirements met?
□ Quality is professional?
□ No errors or typos?
□ Clear and well-structured?
□ Client will be satisfied?

Provide:
1. Quality Score (0-10)
2. Issues found (if any)
3. Decision: SUBMIT / REVISE / DECLINE

If REVISE: explain what to improve.
If DECLINE: explain why this task is beyond capabilities.

Format as JSON:
{
  "score": 8,
  "issues": ["issue1", "issue2"],
  "decision": "SUBMIT",
  "feedback": "explanation"
}
`;

    try {
      const response = await this.llm.chat([
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        maxTokens: 1000
      });

      const review = JSON.parse(response.content);
      
      console.log(`🔍 Self-review score: ${review.score}/10 - Decision: ${review.decision}`);
      
      return review;
    } catch (error) {
      console.error('Self-review error:', error);
      return {
        score: 5,
        issues: ['Failed to self-review'],
        decision: 'SUBMIT',
        feedback: 'Auto-approved due to review failure'
      };
    }
  }

  async externalReview(task, result, previousReview) {
    const prompt = `
You are a quality control expert. Review this work:

TASK:
${task.description}

SUBMITTED WORK:
${result}

SELF-REVIEW SCORE: ${previousReview.score}/10
SELF-IDENTIFIED ISSUES: ${previousReview.issues.join(', ')}

Provide an independent assessment:
1. Do you agree with the self-review score?
2. Are there additional issues?
3. Final decision: APPROVE / REVISE / REJECT

Format as JSON:
{
  "score": 8,
  "agreedWithSelfReview": true,
  "additionalIssues": [],
  "decision": "APPROVE",
  "feedback": "explanation"
}
`;

    try {
      const response = await this.llm.chat([
        { role: 'user', content: prompt }
      ], {
        model: 'openai/gpt-4o-mini', // Cheaper model for review
        temperature: 0.2,
        maxTokens: 800
      });

      const review = JSON.parse(response.content);
      
      console.log(`🔍 External review score: ${review.score}/10 - Decision: ${review.decision}`);
      
      return review;
    } catch (error) {
      console.error('External review error:', error);
      return {
        score: previousReview.score,
        agreedWithSelfReview: true,
        additionalIssues: [],
        decision: 'APPROVE',
        feedback: 'Auto-approved due to review failure'
      };
    }
  }

  async shouldSubmit(task, result, config) {
    // Step 1: Self-review
    const selfReview = await this.selfReview(task, result);
    
    if (selfReview.decision === 'DECLINE') {
      return {
        submit: false,
        reason: 'self_declined',
        review: selfReview
      };
    }

    if (selfReview.score < config.minQualityScore) {
      if (selfReview.decision === 'REVISE') {
        return {
          submit: false,
          reason: 'needs_revision',
          review: selfReview,
          feedback: selfReview.feedback
        };
      }
    }

    // Step 2: External review (if enabled and score borderline)
    if (config.externalReview && selfReview.score < 8) {
      const externalReview = await this.externalReview(task, result, selfReview);
      
      if (externalReview.decision === 'REJECT') {
        return {
          submit: false,
          reason: 'external_rejected',
          review: externalReview
        };
      }
      
      if (externalReview.decision === 'REVISE') {
        return {
          submit: false,
          reason: 'needs_revision',
          review: externalReview,
          feedback: externalReview.feedback
        };
      }
    }

    // All checks passed
    return {
      submit: true,
      reason: 'quality_approved',
      review: selfReview
    };
  }
}

module.exports = QualityControl;
