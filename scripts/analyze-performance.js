#!/usr/bin/env node

const Analytics = require('../lib/analytics');
const fs = require('fs');

const analytics = new Analytics();
const summary = analytics.getSummary();

console.log('📊 PERFORMANCE ANALYSIS');
console.log('======================\n');

// 1. Win Rate Analysis
console.log('1. WIN RATE ANALYSIS\n');

const overallWinRate = analytics.getWinRate();
console.log(`Overall win rate: ${overallWinRate.toFixed(1)}%`);

if (overallWinRate < 30) {
  console.log('   ⚠️  LOW - Need to optimize pricing/strategies');
} else if (overallWinRate > 70) {
  console.log('   ✅ HIGH - Can increase prices');
} else {
  console.log('   ✓  GOOD - Keep current strategy');
}
console.log();

// By strategy
console.log('By Strategy:');
summary.byStrategy.forEach(strategy => {
  const winRate = parseFloat(strategy.winRate);
  let status = '✓';
  let recommendation = '';
  
  if (winRate < 25) {
    status = '❌';
    recommendation = ' - Make more competitive';
  } else if (winRate > 75) {
    status = '📈';
    recommendation = ' - Can raise prices';
  }
  
  console.log(`  ${status} ${strategy.name}: ${strategy.winRate} (${strategy.tasksWon}/${strategy.quotesSubmitted})${recommendation}`);
});
console.log();

// 2. Profitability Analysis
console.log('2. PROFITABILITY ANALYSIS\n');

const roi = analytics.getROI();
const profit = analytics.getProfit();

console.log(`ROI: ${roi.toFixed(1)}%`);
console.log(`Net Profit: ${profit.toFixed(4)} ETH`);

if (roi < 150) {
  console.log('   ⚠️  ROI too low - optimize costs or pricing');
} else if (roi > 300) {
  console.log('   ✅ Excellent ROI - scale up!');
} else {
  console.log('   ✓  Good ROI - sustainable');
}
console.log();

// 3. Category Analysis
console.log('3. CATEGORY PERFORMANCE\n');

summary.topCategories.forEach(cat => {
  const winRate = parseFloat(cat.winRate);
  console.log(`${cat.name}:`);
  console.log(`  Win rate: ${cat.winRate}`);
  console.log(`  Tasks won: ${cat.tasksWon}`);
  
  if (winRate > 60) {
    console.log('  💡 Recommendation: Focus more on this category');
  } else if (winRate < 30) {
    console.log('  ⚠️  Recommendation: Consider dropping this category');
  }
  console.log();
});

// 4. Best performing agent
console.log('4. AGENT PERFORMANCE\n');

summary.byAgent.forEach(agent => {
  const winRate = parseFloat(agent.winRate);
  const profit = parseFloat(agent.profit);
  
  console.log(`${agent.name}:`);
  console.log(`  Win rate: ${agent.winRate}`);
  console.log(`  Profit: ${agent.profit}`);
  console.log(`  Completed: ${agent.tasksCompleted}`);
  
  if (profit < 0) {
    console.log('  ❌ LOSING MONEY - Review or disable');
  } else if (winRate > 60 && profit > 0.01) {
    console.log('  ✅ TOP PERFORMER - Consider cloning');
  }
  console.log();
});

// 5. Recommendations
console.log('5. OPTIMIZATION RECOMMENDATIONS\n');

const recommendations = [];

// Win rate recommendations
if (overallWinRate < 30) {
  recommendations.push('• Lower prices by 10-15%');
  recommendations.push('• Switch losing strategies to "aggressive"');
}
if (overallWinRate > 70) {
  recommendations.push('• Increase prices by 10-15%');
  recommendations.push('• Test "premium" strategy');
}

// Profitability recommendations
if (roi < 200) {
  recommendations.push('• Reduce API costs (use auto-routing)');
  recommendations.push('• Increase minimum profit margin to 3x');
}

// Category recommendations
summary.topCategories.forEach(cat => {
  const winRate = parseFloat(cat.winRate);
  if (winRate > 65) {
    recommendations.push(`• Create more agents for "${cat.name}"`);
  }
  if (winRate < 25 && cat.quotesSubmitted > 5) {
    recommendations.push(`• Stop bidding on "${cat.name}"`);
  }
});

// Agent recommendations
summary.byAgent.forEach(agent => {
  const profit = parseFloat(agent.profit);
  if (profit < 0 && agent.tasksCompleted > 3) {
    recommendations.push(`• Disable or reconfigure "${agent.name}"`);
  }
});

if (recommendations.length > 0) {
  recommendations.forEach(rec => console.log(rec));
} else {
  console.log('✅ No major optimizations needed - keep current setup');
}
console.log();

// 6. Export detailed report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    winRate: overallWinRate,
    roi: roi,
    profit: profit,
    quotesSubmitted: analytics.stats.quotesSubmitted,
    tasksWon: analytics.stats.tasksWon
  },
  byStrategy: summary.byStrategy,
  byAgent: summary.byAgent,
  topCategories: summary.topCategories,
  recommendations
};

fs.writeFileSync(
  `analytics/performance-report-${Date.now()}.json`,
  JSON.stringify(report, null, 2)
);

console.log('📄 Detailed report saved to analytics/');
