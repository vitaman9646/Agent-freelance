const fs = require('fs');
const path = require('path');

class Analytics {
  constructor(analyticsPath = './analytics/stats.json') {
    this.analyticsPath = analyticsPath;
    this.stats = this.load();
  }

  load() {
    try {
      return JSON.parse(fs.readFileSync(this.analyticsPath, 'utf8'));
    } catch (error) {
      return this.getDefaultStats();
    }
  }

  save() {
    fs.writeFileSync(this.analyticsPath, JSON.stringify(this.stats, null, 2));
  }

  getDefaultStats() {
    return {
      quotesSubmitted: 0,
      tasksWon: 0,
      tasksLost: 0,
      tasksCompleted: 0,
      totalEarned: 0,
      totalSpent: 0,
      byAgent: {},
      byCategory: {},
      byStrategy: {},
      timeline: []
    };
  }

  trackQuote(agentName, task, quote) {
    this.stats.quotesSubmitted++;
    
    this.initAgent(agentName);
    this.stats.byAgent[agentName].quotesSubmitted++;
    
    this.initCategory(task.category);
    this.stats.byCategory[task.category].quotesSubmitted++;
    
    this.initStrategy(quote.strategy);
    this.stats.byStrategy[quote.strategy].quotesSubmitted++;
    
    this.addTimelineEvent('quote', {
      agentName,
      taskId: task.id,
      category: task.category,
      strategy: quote.strategy,
      price: quote.price
    });
    
    this.save();
  }

  trackWin(agentName, task, quote) {
    this.stats.tasksWon++;
    
    this.stats.byAgent[agentName].tasksWon++;
    this.stats.byCategory[task.category].tasksWon++;
    this.stats.byStrategy[quote.strategy].tasksWon++;
    
    this.addTimelineEvent('win', {
      agentName,
      taskId: task.id,
      category: task.category,
      strategy: quote.strategy,
      price: quote.price
    });
    
    this.save();
  }

  trackLoss(agentName, task, quote) {
    this.stats.tasksLost++;
    
    this.stats.byAgent[agentName].tasksLost++;
    this.stats.byCategory[task.category].tasksLost++;
    this.stats.byStrategy[quote.strategy].tasksLost++;
    
    this.save();
  }

  trackCompletion(agentName, task, earnings, cost) {
    this.stats.tasksCompleted++;
    this.stats.totalEarned += earnings;
    this.stats.totalSpent += cost;
    
    this.stats.byAgent[agentName].tasksCompleted++;
    this.stats.byAgent[agentName].totalEarned += earnings;
    this.stats.byAgent[agentName].totalSpent += cost;
    
    this.addTimelineEvent('completion', {
      agentName,
      taskId: task.id,
      earnings,
      cost,
      profit: earnings - cost
    });
    
    this.save();
  }

  initAgent(name) {
    if (!this.stats.byAgent[name]) {
      this.stats.byAgent[name] = {
        quotesSubmitted: 0,
        tasksWon: 0,
        tasksLost: 0,
        tasksCompleted: 0,
        totalEarned: 0,
        totalSpent: 0
      };
    }
  }

  initCategory(category) {
    if (!this.stats.byCategory[category]) {
      this.stats.byCategory[category] = {
        quotesSubmitted: 0,
        tasksWon: 0,
        tasksLost: 0
      };
    }
  }

  initStrategy(strategy) {
    if (!this.stats.byStrategy[strategy]) {
      this.stats.byStrategy[strategy] = {
        quotesSubmitted: 0,
        tasksWon: 0,
        tasksLost: 0
      };
    }
  }

  addTimelineEvent(type, data) {
    this.stats.timeline.push({
      timestamp: Date.now(),
      type,
      ...data
    });
    
    // Keep only last 1000 events
    if (this.stats.timeline.length > 1000) {
      this.stats.timeline = this.stats.timeline.slice(-1000);
    }
  }

  getWinRate(filter = {}) {
    let submitted = this.stats.quotesSubmitted;
    let won = this.stats.tasksWon;
    
    if (filter.agent) {
      const agent = this.stats.byAgent[filter.agent];
      submitted = agent.quotesSubmitted;
      won = agent.tasksWon;
    } else if (filter.category) {
      const category = this.stats.byCategory[filter.category];
      submitted = category.quotesSubmitted;
      won = category.tasksWon;
    } else if (filter.strategy) {
      const strategy = this.stats.byStrategy[filter.strategy];
      submitted = strategy.quotesSubmitted;
      won = strategy.tasksWon;
    }
    
    return submitted > 0 ? (won / submitted) * 100 : 0;
  }

  getProfit(filter = {}) {
    let earned = this.stats.totalEarned;
    let spent = this.stats.totalSpent;
    
    if (filter.agent) {
      const agent = this.stats.byAgent[filter.agent];
      earned = agent.totalEarned;
      spent = agent.totalSpent;
    }
    
    return earned - spent;
  }

  getROI(filter = {}) {
    const profit = this.getProfit(filter);
    let spent = this.stats.totalSpent;
    
    if (filter.agent) {
      spent = this.stats.byAgent[filter.agent].totalSpent;
    }
    
    return spent > 0 ? (profit / spent) * 100 : 0;
  }

  getSummary() {
    return {
      overview: {
        quotesSubmitted: this.stats.quotesSubmitted,
        tasksWon: this.stats.tasksWon,
        tasksLost: this.stats.tasksLost,
        tasksCompleted: this.stats.tasksCompleted,
        winRate: this.getWinRate().toFixed(1) + '%',
        totalEarned: this.stats.totalEarned.toFixed(4) + ' ETH',
        totalSpent: this.stats.totalSpent.toFixed(4) + ' ETH',
        profit: this.getProfit().toFixed(4) + ' ETH',
        roi: this.getROI().toFixed(1) + '%'
      },
      byAgent: Object.entries(this.stats.byAgent).map(([name, stats]) => ({
        name,
        ...stats,
        winRate: this.getWinRate({ agent: name }).toFixed(1) + '%',
        profit: (stats.totalEarned - stats.totalSpent).toFixed(4) + ' ETH'
      })),
      byStrategy: Object.entries(this.stats.byStrategy).map(([name, stats]) => ({
        name,
        ...stats,
        winRate: this.getWinRate({ strategy: name }).toFixed(1) + '%'
      })),
      topCategories: Object.entries(this.stats.byCategory)
        .map(([name, stats]) => ({
          name,
          ...stats,
          winRate: this.getWinRate({ category: name }).toFixed(1) + '%'
        }))
        .sort((a, b) => b.tasksWon - a.tasksWon)
        .slice(0, 5)
    };
  }

  printSummary() {
    const summary = this.getSummary();
    
    console.log('\n📊 ANALYTICS SUMMARY');
    console.log('===================\n');
    
    console.log('Overview:');
    console.log(`  Quotes: ${summary.overview.quotesSubmitted}`);
    console.log(`  Won: ${summary.overview.tasksWon} (${summary.overview.winRate})`);
    console.log(`  Lost: ${summary.overview.tasksLost}`);
    console.log(`  Completed: ${summary.overview.tasksCompleted}`);
    console.log(`  Earned: ${summary.overview.totalEarned}`);
    console.log(`  Spent: ${summary.overview.totalSpent}`);
    console.log(`  Profit: ${summary.overview.profit}`);
    console.log(`  ROI: ${summary.overview.roi}\n`);
    
    if (summary.byAgent.length > 0) {
      console.log('By Agent:');
      summary.byAgent.forEach(agent => {
        console.log(`  ${agent.name}: ${agent.tasksWon} won (${agent.winRate}), ${agent.profit} profit`);
      });
      console.log();
    }
    
    if (summary.byStrategy.length > 0) {
      console.log('By Strategy:');
      summary.byStrategy.forEach(strategy => {
        console.log(`  ${strategy.name}: ${strategy.tasksWon}/${strategy.quotesSubmitted} (${strategy.winRate})`);
      });
      console.log();
    }
  }
}

module.exports = Analytics;
