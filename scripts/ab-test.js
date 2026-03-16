#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * A/B Testing Framework
 * Автоматически тестирует 2 стратегии параллельно
 */

class ABTest {
  constructor(name, variantA, variantB, duration = 7) {
    this.name = name;
    this.variantA = variantA;
    this.variantB = variantB;
    this.duration = duration; // days
    this.startTime = Date.now();
    this.results = {
      A: { quotes: 0, wins: 0, profit: 0 },
      B: { quotes: 0, wins: 0, profit: 0 }
    };
  }

  // Randomly select variant (50/50 split)
  selectVariant() {
    return Math.random() < 0.5 ? 'A' : 'B';
  }

  // Get config for selected variant
  getConfig(variant) {
    return variant === 'A' ? this.variantA : this.variantB;
  }

  // Track result
  trackQuote(variant) {
    this.results[variant].quotes++;
    this.save();
  }

  trackWin(variant, profit) {
    this.results[variant].wins++;
    this.results[variant].profit += profit;
    this.save();
  }

  // Calculate metrics
  getMetrics(variant) {
    const data = this.results[variant];
    return {
      winRate: data.quotes > 0 ? (data.wins / data.quotes) * 100 : 0,
      avgProfit: data.wins > 0 ? data.profit / data.wins : 0,
      totalProfit: data.profit
    };
  }

  // Determine winner
  getWinner() {
    const metricsA = this.getMetrics('A');
    const metricsB = this.getMetrics('B');

    // Need minimum sample size
    if (this.results.A.quotes < 10 || this.results.B.quotes < 10) {
      return { winner: null, reason: 'Insufficient data' };
    }

    // Compare by profit first, then win rate
    const profitDiff = metricsB.totalProfit - metricsA.totalProfit;
    const winRateDiff = metricsB.winRate - metricsA.winRate;

    if (Math.abs(profitDiff) < 0.001) {
      // Profits similar, compare win rates
      if (winRateDiff > 5) {
        return { winner: 'B', reason: `Higher win rate (${metricsB.winRate.toFixed(1)}% vs ${metricsA.winRate.toFixed(1)}%)` };
      } else if (winRateDiff < -5) {
        return { winner: 'A', reason: `Higher win rate (${metricsA.winRate.toFixed(1)}% vs ${metricsB.winRate.toFixed(1)}%)` };
      } else {
        return { winner: null, reason: 'Too close to call' };
      }
    } else {
      // Clear profit winner
      if (profitDiff > 0) {
        return { winner: 'B', reason: `Higher profit (${metricsB.totalProfit.toFixed(4)} ETH vs ${metricsA.totalProfit.toFixed(4)} ETH)` };
      } else {
        return { winner: 'A', reason: `Higher profit (${metricsA.totalProfit.toFixed(4)} ETH vs ${metricsB.totalProfit.toFixed(4)} ETH)` };
      }
    }
  }

  // Print report
  printReport() {
    console.log(`\n📊 A/B Test Report: ${this.name}`);
    console.log('='.repeat(50));

    const daysRunning = (Date.now() - this.startTime) / (1000 * 60 * 60 * 24);
    console.log(`Running for: ${daysRunning.toFixed(1)} days`);
    console.log();

    ['A', 'B'].forEach(variant => {
      const config = variant === 'A' ? this.variantA : this.variantB;
      const metrics = this.getMetrics(variant);
      const data = this.results[variant];

      console.log(`Variant ${variant}: ${config.name}`);
      console.log(`  Quotes:    ${data.quotes}`);
      console.log(`  Wins:      ${data.wins}`);
      console.log(`  Win Rate:  ${metrics.winRate.toFixed(1)}%`);
      console.log(`  Profit:    ${metrics.totalProfit.toFixed(4)} ETH`);
      console.log(`  Avg/Win:   ${metrics.avgProfit.toFixed(4)} ETH`);
      console.log();
    });

    const winner = this.getWinner();
    if (winner.winner) {
      console.log(`🏆 Winner: Variant ${winner.winner}`);
      console.log(`   Reason: ${winner.reason}`);
    } else {
      console.log(`⏳ ${winner.reason}`);
    }
    console.log();
  }

  // Save to file
  save() {
    const testPath = path.join(__dirname, '../analytics/ab-tests.json');
    let tests = {};
    
    try {
      tests = JSON.parse(fs.readFileSync(testPath, 'utf8'));
    } catch (e) {
      // File doesn't exist yet
    }

    tests[this.name] = {
      startTime: this.startTime,
      variantA: this.variantA,
      variantB: this.variantB,
      results: this.results
    };

    fs.writeFileSync(testPath, JSON.stringify(tests, null, 2));
  }

  // Load from file
  static load(name) {
    const testPath = path.join(__dirname, '../analytics/ab-tests.json');
    try {
      const tests = JSON.parse(fs.readFileSync(testPath, 'utf8'));
      const data = tests[name];
      
      if (!data) return null;

      const test = new ABTest(name, data.variantA, data.variantB);
      test.startTime = data.startTime;
      test.results = data.results;
      return test;
    } catch (e) {
      return null;
    }
  }
}

// Example: Test pricing strategies
const pricingTest = new ABTest(
  'pricing-strategy-test',
  {
    name: 'Conservative (0.85x)',
    priceMultiplier: 0.85
  },
  {
    name: 'Aggressive (0.75x)',
    priceMultiplier: 0.75
  },
  7 // 7 days
);

// Example: Test quote styles
const quoteStyleTest = new ABTest(
  'quote-style-test',
  {
    name: 'Detailed',
    style: 'detailed'
  },
  {
    name: 'Ultra-detailed',
    style: 'ultra-detailed'
  },
  7
);

module.exports = ABTest;

// CLI usage
if (require.main === module) {
  const testName = process.argv[2];
  
  if (!testName) {
    console.log('Usage: node ab-test.js <test-name>');
    console.log('\nAvailable tests:');
    console.log('  pricing-strategy-test');
    console.log('  quote-style-test');
    process.exit(1);
  }

  const test = ABTest.load(testName);
  
  if (!test) {
    console.log(`Test "${testName}" not found`);
    process.exit(1);
  }

  test.printReport();
                                       }
