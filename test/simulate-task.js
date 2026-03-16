#!/usr/bin/env node

require('dotenv').config();
const BiddingEngine = require('../lib/bidding-engine');
const fs = require('fs');
const path = require('path');

async function simulateTask() {
  console.log('🎭 Simulating a real task workflow...\n');

  // Load configs
  const agentsConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/agents.json'), 'utf8')
  );
  const strategiesConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/bidding-strategies.json'), 'utf8')
  );

  const agent = agentsConfig.agents.find(a => a.name === 'agent-writer');
  const engine = new BiddingEngine(agent, strategiesConfig);

  // Real-world task example
  const task = {
    id: 'sim-001',
    title: 'Write SEO blog post about sustainable fashion',
    description: `Need a 1200-word SEO-optimized blog post about sustainable fashion trends in 2024.

Requirements:
- Focus on eco-friendly materials and practices
- Include 3-5 brand examples
- SEO keywords: sustainable fashion, eco-friendly clothing, ethical brands
- Professional but engaging tone
- Include a compelling introduction and conclusion
- Proper H2/H3 structure

Budget: 0.025 ETH
Deadline: 48 hours`,
    category: 'content writing',
    tags: ['content writing', 'blog post', 'seo'],
    budget: 0.025,
    quotesCount: 4,
    createdAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago
    deadline: Date.now() + 48 * 60 * 60 * 1000
  };

  console.log('📋 Task Details:');
  console.log(`   Title: ${task.title}`);
  console.log(`   Budget: ${task.budget} ETH`);
  console.log(`   Competitors: ${task.quotesCount}`);
  console.log(`   Category: ${task.category}`);
  console.log();

  // Step 1: Evaluate
  console.log('Step 1: Evaluating task...');
  const evaluation = await engine.evaluateTask(task);
  
  if (!evaluation.shouldBid) {
    console.log(`❌ Should NOT bid`);
    console.log(`   Reason: ${evaluation.reason}`);
    console.log(`   Details: ${evaluation.details}`);
    return;
  }

  console.log('✅ Should bid!');
  console.log(`   Win probability: ${(evaluation.winProbability * 100).toFixed(1)}%`);
  console.log(`   Profitability: ${evaluation.profitability.toFixed(2)}x`);
  console.log(`   Recommended price: ${evaluation.recommendedPrice} ETH`);
  console.log(`   Strategy: ${evaluation.strategy}`);
  console.log(`   Estimated cost: ${evaluation.estimatedCost.toFixed(4)} ETH`);
  console.log(`   Estimated profit: ${evaluation.estimatedProfit.toFixed(4)} ETH`);
  console.log();

  // Step 2: Generate quote
  console.log('Step 2: Generating quote message...');
  const quote = await engine.generateQuote(task, evaluation);
  
  console.log('📝 Quote:');
  console.log(`   Price: ${quote.price} ETH`);
  console.log(`   Delivery: ${quote.estimatedDelivery}`);
  console.log(`   Strategy: ${quote.strategy}`);
  console.log();
  console.log('   Message:');
  console.log('   ┌─────────────────────────────────────────');
  quote.message.split('\n').forEach(line => {
    console.log(`   │ ${line}`);
  });
  console.log('   └─────────────────────────────────────────');
  console.log();

  // Step 3: Track quote
  console.log('Step 3: Tracking quote in analytics...');
  engine.trackQuote('sim-001', quote, task);
  console.log('✅ Quote tracked');
  console.log();

  // Simulate win
  console.log('Step 4: Simulating WIN scenario...');
  engine.trackWin('sim-001', quote, task);
  console.log('✅ Win tracked');
  console.log();

  // Show analytics
  const analytics = engine.getAnalytics();
  console.log('📊 Updated Analytics:');
  console.log(`   Total quotes: ${analytics.quotesSubmitted}`);
  console.log(`   Total wins: ${analytics.tasksWon}`);
  console.log(`   Win rate: ${analytics.winRate.toFixed(1)}%`);
  console.log();

  console.log('═══════════════════════════════════');
  console.log('✅ Simulation complete!');
  console.log('═══════════════════════════════════');
}

simulateTask();
