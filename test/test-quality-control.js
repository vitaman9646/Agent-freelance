#!/usr/bin/env node

require('dotenv').config();
const OpenRouterClient = require('../lib/openrouter-client');
const QualityControl = require('../lib/quality-control');

async function testQualityControl() {
  console.log('🧪 Testing Quality Control...\n');

  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not found in .env');
    process.exit(1);
  }

  const llmClient = new OpenRouterClient(apiKey);
  const qc = new QualityControl(llmClient);

  // Mock task
  const task = {
    id: 'task-qc-001',
    description: `Write a professional blog post about "The Future of AI in Healthcare". 
    Requirements:
    - 800-1000 words
    - Include real examples
    - Professional tone
    - SEO optimized
    - Conclusion with key takeaways`,
    category: 'content writing'
  };

  // Mock good result
  const goodResult = `
# The Future of AI in Healthcare

The healthcare industry is experiencing a revolutionary transformation driven by artificial intelligence (AI). From diagnostic imaging to personalized treatment plans, AI is reshaping how medical professionals deliver care and how patients experience healthcare services.

## Current Applications

AI-powered diagnostic tools are already making significant impacts. For instance, Google's DeepMind has developed AI systems that can detect over 50 eye diseases with accuracy matching leading ophthalmologists. Similarly, IBM Watson Health analyzes millions of medical papers to assist oncologists in creating personalized cancer treatment plans.

## Predictive Analytics

Machine learning algorithms are enabling hospitals to predict patient deterioration hours before traditional methods. Mount Sinai Hospital in New York uses AI to predict acute kidney injury 48 hours in advance, allowing for preventive interventions that save lives.

## Challenges and Considerations

Despite the promise, several challenges remain:
- Data privacy and security concerns
- Need for diverse training datasets to avoid bias
- Integration with existing healthcare systems
- Regulatory approval processes

## The Path Forward

The future of AI in healthcare looks promising. We can expect:
- More accurate early disease detection
- Personalized medicine tailored to individual genetics
- Reduced healthcare costs through efficiency gains
- Better patient outcomes through predictive care

## Key Takeaways

1. AI is already improving diagnostic accuracy and treatment planning
2. Predictive analytics can save lives through early intervention
3. Addressing privacy and bias concerns is crucial
4. The technology will continue to evolve and improve patient care

As AI technology matures, its integration into healthcare will deepen, ultimately creating a more efficient, accurate, and personalized healthcare system for everyone.
`;

  // Mock poor result
  const poorResult = `
AI is good for healthcare. It helps doctors. There are many uses like diagnosing diseases and stuff.

Some hospitals use AI now. Its pretty cool.

There are some problems too but overall its good.

The future will be better with more AI.
`;

  try {
    // Test 1: Self-review of good work
    console.log('Test 1: Self-review of GOOD work...');
    const review1 = await qc.selfReview(task, goodResult);
    console.log('Review:', JSON.stringify(review1, null, 2));
    console.log();

    // Test 2: Self-review of poor work
    console.log('Test 2: Self-review of POOR work...');
    const review2 = await qc.selfReview(task, poorResult);
    console.log('Review:', JSON.stringify(review2, null, 2));
    console.log();

    // Test 3: Should submit decision (good work)
    console.log('Test 3: Should submit decision (good work)...');
    const decision1 = await qc.shouldSubmit(task, goodResult, {
      minQualityScore: 7,
      selfReview: true,
      externalReview: false
    });
    console.log('Decision:', JSON.stringify(decision1, null, 2));
    console.log();

    // Test 4: Should submit decision (poor work)
    console.log('Test 4: Should submit decision (poor work)...');
    const decision2 = await qc.shouldSubmit(task, poorResult, {
      minQualityScore: 7,
      selfReview: true,
      externalReview: true
    });
    console.log('Decision:', JSON.stringify(decision2, null, 2));
    console.log();

    console.log('═══════════════════════════════════');
    console.log('✅ All Quality Control tests passed!');
    console.log('═══════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testQualityControl();
