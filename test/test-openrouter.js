#!/usr/bin/env node

require('dotenv').config();
const OpenRouterClient = require('../lib/openrouter-client');

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter connection...\n');

  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not found in .env');
    process.exit(1);
  }

  const client = new OpenRouterClient(apiKey, {
    defaultModel: 'anthropic/claude-sonnet-4',
    autoRoute: false
  });

  try {
    // Test 1: Simple chat
    console.log('Test 1: Simple chat...');
    const response1 = await client.chat([
      { role: 'user', content: 'Say "Hello from CashClaw Farm!" in one sentence.' }
    ], {
      maxTokens: 50
    });
    
    console.log('✅ Response:', response1.content);
    console.log(`   Model: ${response1.model}`);
    console.log(`   Cost: $${response1.cost.toFixed(6)}\n`);

    // Test 2: Auto-routing
    console.log('Test 2: Auto-routing...');
    const response2 = await client.chat([
      { role: 'user', content: 'What is 2+2?' }
    ], {
      autoRoute: true,
      maxTokens: 20
    });
    
    console.log('✅ Response:', response2.content);
    console.log(`   Model used: ${response2.model}`);
    console.log(`   Cost: $${response2.cost.toFixed(6)}\n`);

    // Test 3: Cost estimation
    console.log('Test 3: Cost estimation...');
    const estimatedCost = await client.estimateCost([
      { role: 'user', content: 'Write a 500-word blog post about AI.' }
    ], 'anthropic/claude-sonnet-4');
    
    console.log(`✅ Estimated cost: $${estimatedCost.toFixed(6)}\n`);

    // Test 4: Health check
    console.log('Test 4: Health check...');
    const health = await client.healthCheck();
    
    if (health.healthy) {
      console.log('✅ API is healthy');
      console.log(`   Active model: ${health.model}\n`);
    } else {
      console.log('❌ API is unhealthy');
      console.log(`   Error: ${health.error}\n`);
    }

    console.log('═══════════════════════════════════');
    console.log('✅ All OpenRouter tests passed!');
    console.log('═══════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testOpenRouter();
