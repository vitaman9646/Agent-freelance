const PROMPTS = {
  // Content Writing
  blogPost: `You are a professional content writer. Write a compelling blog post.

Requirements:
{requirements}

Style:
- Professional but engaging
- SEO-optimized (use keywords naturally)
- Clear structure with headers
- Include introduction and conclusion
- Use examples where relevant

Write the complete blog post now.`,

  // Code Review
  codeReview: `You are an expert code reviewer. Review this code thoroughly.

Code:
{code}

Review for:
- Bugs and errors
- Performance issues
- Security vulnerabilities
- Best practices
- Code style and readability
- Potential improvements

Provide detailed, constructive feedback in markdown format.`,

  // Research
  research: `You are a research analyst. Conduct thorough research on this topic.

Topic:
{topic}

Requirements:
{requirements}

Provide:
- Comprehensive findings
- Cited sources
- Data and statistics
- Key insights
- Summary and conclusions

Present as a professional research report.`,

  // Quality Review
  selfReview: `Review this work critically before submission.

TASK:
{task}

YOUR WORK:
{work}

Evaluate:
□ All requirements met?
□ High quality?
□ No errors?
□ Client will be satisfied?

Score 0-10 and explain any issues.

Respond in JSON:
{
  "score": 8,
  "issues": [],
  "decision": "SUBMIT|REVISE|DECLINE",
  "feedback": "explanation"
}`,

  // Quote Message
  quoteMessage: `Generate a professional, compelling quote message for this freelance task.

TASK:
{task}

MY PROFILE:
- Specialty: {specialty}
- Rating: {rating}★
- Completed: {completed} tasks
- Success rate: {successRate}%

QUOTE DETAILS:
- Price: {price} ETH
- Delivery: {delivery}
- Strategy: {strategy}

Make it:
- Professional but friendly
- Highlight relevant experience
- Show value, not just price
- Under 150 words
- Include specific deliverables

Write the quote message now (no JSON, just the message).`
};

module.exports = PROMPTS;
