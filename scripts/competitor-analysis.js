#!/usr/bin/env node

/**
 * Анализ конкурентов на маркетплейсе
 * Помогает понять почему проигрываем тендеры
 */

const fetch = require('node-fetch');

async function analyzeCompetitors(taskId) {
  console.log('🔍 COMPETITOR ANALYSIS\n');
  console.log(`Task: ${taskId}\n`);

  // Получить quotes для задачи (mock - нужна реальная API)
  const quotes = await fetchTaskQuotes(taskId);

  if (!quotes || quotes.length === 0) {
    console.log('No quotes found for this task');
    return;
  }

  console.log(`Total quotes: ${quotes.length}\n`);

  // Анализ цен
  const prices = quotes.map(q => q.price).sort((a, b) => a - b);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const lowestPrice = prices[0];
  const highestPrice = prices[prices.length - 1];

  console.log('Price Analysis:');
  console.log(`  Lowest:  ${lowestPrice.toFixed(4)} ETH`);
  console.log(`  Median:  ${medianPrice.toFixed(4)} ETH`);
  console.log(`  Average: ${avgPrice.toFixed(4)} ETH`);
  console.log(`  Highest: ${highestPrice.toFixed(4)} ETH\n`);

  // Анализ рейтингов
  const ratings = quotes
    .filter(q => q.rating > 0)
    .map(q => q.rating)
    .sort((a, b) => b - a);

  if (ratings.length > 0) {
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    console.log('Rating Analysis:');
    console.log(`  Top rating: ${ratings[0].toFixed(1)}★`);
    console.log(`  Avg rating: ${avgRating.toFixed(1)}★\n`);
  }

  // Анализ сообщений
  console.log('Message Analysis:');
  quotes.forEach((q, i) => {
    const wordCount = q.message.split(' ').length;
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(q.message);
    const hasBullets = q.message.includes('•') || q.message.includes('✓');
    
    console.log(`  Quote #${i + 1}:`);
    console.log(`    Price: ${q.price.toFixed(4)} ETH`);
    console.log(`    Rating: ${q.rating.toFixed(1)}★`);
    console.log(`    Words: ${wordCount}`);
    console.log(`    Has emoji: ${hasEmoji}`);
    console.log(`    Has bullets: ${hasBullets}`);
    console.log(`    Preview: "${q.message.substring(0, 80)}..."`);
    console.log();
  });

  // Recommendations
  console.log('💡 Recommendations:\n');

  const ourPrice = 0.012; // example
  if (ourPrice > medianPrice * 1.1) {
    console.log(`  • Your price (${ourPrice.toFixed(4)} ETH) is ${((ourPrice/medianPrice - 1) * 100).toFixed(0)}% above median`);
    console.log(`  • Consider lowering to ${medianPrice.toFixed(4)} ETH or below`);
  } else if (ourPrice < lowestPrice) {
    console.log(`  • You're the lowest bidder - could increase price`);
  } else {
    console.log(`  • Your price is competitive`);
  }

  console.log();
}

// Mock function - replace with real API
async function fetchTaskQuotes(taskId) {
  // This would call Moltlaunch API
  // For now, return mock data
  return [
    {
      price: 0.015,
      rating: 4.8,
      completedTasks: 45,
      message: "Hi! I'm a professional writer with 45 completed tasks. I'll deliver a high-quality blog post..."
    },
    {
      price: 0.012,
      rating: 4.5,
      completedTasks: 23,
      message: "Hello! I specialize in blog posts and SEO content. ✓ Original content ✓ SEO optimized..."
    },
    {
      price: 0.010,
      rating: 0,
      completedTasks: 0,
      message: "I can do this for 0.01 ETH"
    }
  ];
}

// Run if called directly
if (require.main === module) {
  const taskId = process.argv[2];
  
  if (!taskId) {
    console.log('Usage: node competitor-analysis.js <task-id>');
    process.exit(1);
  }

  analyzeCompetitors(taskId);
}

module.exports = { analyzeCompetitors };
