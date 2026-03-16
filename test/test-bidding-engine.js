#!/usr/bin/env node

const BiddingEngine = require('../lib/bidding-engine');
const fs = require('fs');
const path = require('path');

async function testBiddingEngine() {
  console.log('🧪 Testing Bidding Engine...\n');

  // Load configs
  const agentsConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/agents.json'), 'utf8')
  );
  const strategiesConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/bidding-strategies.json'), 'utf8')
  );

  const agent = agentsConfig.agents[0]; // Test with first agent
  const engine = new BiddingEngine(agent, strategiesConfig);

  // Mock task 1: Good match
  const task1 = {
    id: 'task-001',
    description: 'Write a 1000-word blog post about TypeScript best practices',
    category: 'content writing',
    tags: ['content writing', 'technical writing'],
    budget: 0.02,
    quotesCount: 3,
    createdAt: Date.now() - 5 * 60 * 1000 // 5 minutes ago
  };

  console.log('Test 1: Evaluating good match task...');
  const evaluation1 = await engine.evaluateTask(task1);
  console.log('Result:', JSON.stringify(evaluation1, null, 2));
  console.log();

  if (evaluation1.shouldBid) {
    console.log('Test 1.1: Generating quote...');
    const quote1 = await engine.generateQuote(task1, evaluation1);
    console.log('Quote:', JSON.stringify(quote1, null, 2));
    console.log();
  }

  // Mock task 2: Bad match (wrong specialty)
  const task2 = {
    id: 'task-002',
    description: 'Design a logo for a startup',
    category: 'graphic design',
    tags: ['design', 'logo', 'branding'],
    budget: 0.05,
    quotesCount: 2,
    createdAt: Date.now()
  };

  console.log('Test 2: Evaluating bad match task...');
  const evaluation2 = await engine.evaluateTask(task2);
  console.log('Result:', JSON.stringify(evaluation2, null, 2));
  console.log();

  // Mock task 3: Too much competition
  const task3 = {
    id: 'task-003',
    description: 'Write a blog post about AI',
    category: 'content writing',
    tags: ['content writing'],
    budget: 0.015,
    quotesCount: 15,
    createdAt: Date.now()
  };

  console.log('Test 3: Evaluating high competition task...');
  const evaluation3 = await engine.evaluateTask(task3);
  console.log('Result:', JSON.stringify(evaluation3, null, 2));
  console.log();

  // Mock task 4: Low profitability
  const task4 = {
    id: 'task-004',
    description: 'Write a 5000-word detailed technical article with research',
    category: 'content writing',
    tags: ['content writing', 'research'],
    budget: 0.002, // Too low for complexity
    quotesCount: 1,
    createdAt: Date.now()
  };

  console.log('Test 4: Evaluating low profit task...');
  const evaluation4 = await engine.evaluateTask(task4);
  console.log('Result:', JSON.stringify(evaluation4, null, 2));
  console.log();

  // Test analytics
  console.log('Test 5: Analytics tracking...');
  engine.trackQuote('task-001', { strategy: 'competitive', price: 0.018 }, task1);
  engine.trackWin('task-001', { strategy: 'competitive', price: 0.018 }, task1);
  
  const winRate = engine.getWinRate();
  console.log(`Win rate: ${winRate.toFixed(1)}%`);
  
  const analytics = engine.getAnalytics();
  console.log('Analytics:', JSON.stringify(analytics, null, 2));
  console.log();

  console.log('═══════════════════════════════════');
  console.log('✅ All Bidding Engine tests passed!');
  console.log('═══════════════════════════════════\n');
}

testBiddingEngine();
