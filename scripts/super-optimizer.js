#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Analytics = require('../lib/analytics');

/**
 * SUPER OPTIMIZER
 * Оптимизирует все параметры агентов на основе данных
 */

class SuperOptimizer {
  constructor() {
    this.analytics = new Analytics();
    this.MIN_SAMPLE = 20;
    this.changes = [];
    
    // Load configs
    this.agentsConfig = this.loadConfig('agents.json');
    this.strategiesConfig = this.loadConfig('bidding-strategies.json');
    this.llmConfig = this.loadConfig('llm.json');
  }

  loadConfig(filename) {
    const configPath = path.join(__dirname, '../config', filename);
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  saveConfig(filename, data) {
    const configPath = path.join(__dirname, '../config', filename);
    
    // Backup first
    const backupPath = `${configPath}.backup-${Date.now()}`;
    fs.copyFileSync(configPath, backupPath);
    
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved ${filename}`);
    console.log(`💾 Backup: ${backupPath}`);
  }

  // ============================================
  // 1. OPTIMIZE PRICING STRATEGIES
  // ============================================
  
  optimizePricing() {
    console.log('\n1️⃣  OPTIMIZING PRICING STRATEGIES\n');
    
    Object.entries(this.analytics.stats.byStrategy).forEach(([strategyName, stats]) => {
      if (stats.quotesSubmitted < this.MIN_SAMPLE) {
        console.log(`⏭️  ${strategyName}: Insufficient data (${stats.quotesSubmitted} quotes)`);
        return;
      }

      const winRate = (stats.tasksWon / stats.quotesSubmitted) * 100;
      const strategy = this.strategiesConfig.strategies[strategyName];
      
      if (!strategy) return;

      const oldMultiplier = strategy.priceMultiplier;
      let newMultiplier = oldMultiplier;
      let reason = '';

      // Optimization logic
      if (winRate < 20) {
        newMultiplier = oldMultiplier * 0.90;
        reason = 'Win rate too low (<20%) - aggressive price cut';
      } else if (winRate < 30) {
        newMultiplier = oldMultiplier * 0.95;
        reason = 'Win rate low (20-30%) - lower prices';
      } else if (winRate > 80) {
        newMultiplier = oldMultiplier * 1.10;
        reason = 'Win rate very high (>80%) - raise prices significantly';
      } else if (winRate > 70) {
        newMultiplier = oldMultiplier * 1.05;
        reason = 'Win rate high (70-80%) - raise prices';
      } else if (winRate >= 50 && winRate <= 60) {
        // Sweet spot - minor optimization
        const profitPerTask = stats.totalProfit / stats.tasksWon;
        if (profitPerTask < 0.005) {
          newMultiplier = oldMultiplier * 1.03;
          reason = 'Optimal win rate but low profit - slight increase';
        } else {
          reason = 'Optimal range - no change';
        }
      } else {
        reason = 'Acceptable range - no change';
      }

      // Apply limits
      newMultiplier = Math.max(0.5, Math.min(1.5, newMultiplier));
      newMultiplier = parseFloat(newMultiplier.toFixed(2));

      console.log(`${strategyName}:`);
      console.log(`  Win rate: ${winRate.toFixed(1)}%`);
      console.log(`  Old multiplier: ${oldMultiplier.toFixed(2)}`);
      console.log(`  New multiplier: ${newMultiplier.toFixed(2)}`);
      console.log(`  Reason: ${reason}`);
      console.log();

      if (newMultiplier !== oldMultiplier) {
        strategy.priceMultiplier = newMultiplier;
        this.changes.push(`Pricing: ${strategyName} ${oldMultiplier.toFixed(2)} → ${newMultiplier.toFixed(2)}`);
      }
    });
  }

  // ============================================
  // 2. OPTIMIZE SPECIALTIES (CATEGORIES)
  // ============================================
  
  optimizeSpecialties() {
    console.log('\n2️⃣  OPTIMIZING SPECIALTIES\n');

    this.agentsConfig.agents.forEach(agent => {
      console.log(`Agent: ${agent.name}`);
      
      // Analyze performance by category
      const categoryPerformance = {};
      
      Object.entries(this.analytics.stats.byCategory).forEach(([category, stats]) => {
        if (stats.quotesSubmitted < 5) return;
        
        const winRate = (stats.tasksWon / stats.quotesSubmitted) * 100;
        const isAgentSpecialty = agent.specialties.some(s => 
          s.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(s.toLowerCase())
        );
        
        if (isAgentSpecialty) {
          categoryPerformance[category] = {
            winRate,
            quotes: stats.quotesSubmitted,
            wins: stats.tasksWon
          };
        }
      });

      // Find underperforming categories
      const underperforming = Object.entries(categoryPerformance)
        .filter(([cat, perf]) => perf.winRate < 25 && perf.quotes > 10)
        .map(([cat]) => cat);

      // Find high-performing categories
      const highPerforming = Object.entries(categoryPerformance)
        .filter(([cat, perf]) => perf.winRate > 65 && perf.wins > 5)
        .map(([cat]) => cat);

      console.log(`  Category performance:`);
      Object.entries(categoryPerformance).forEach(([cat, perf]) => {
        console.log(`    ${cat}: ${perf.winRate.toFixed(1)}% (${perf.wins}/${perf.quotes})`);
      });

      // Recommendations
      if (underperforming.length > 0) {
        console.log(`  ❌ Underperforming: ${underperforming.join(', ')}`);
        console.log(`  💡 Recommendation: Remove these specialties`);
        
        // Auto-remove if very bad
        underperforming.forEach(cat => {
          const perf = categoryPerformance[cat];
          if (perf.winRate < 15 && perf.quotes > 15) {
            agent.specialties = agent.specialties.filter(s => 
              !s.toLowerCase().includes(cat.toLowerCase())
            );
            this.changes.push(`Removed specialty "${cat}" from ${agent.name} (${perf.winRate.toFixed(1)}% win rate)`);
            console.log(`  🗑️  Auto-removed: ${cat}`);
          }
        });
      }

      if (highPerforming.length > 0) {
        console.log(`  ✅ High-performing: ${highPerforming.join(', ')}`);
        console.log(`  💡 Recommendation: Focus more on these, consider cloning agent`);
      }

      console.log();
    });
  }

  // ============================================
  // 3. OPTIMIZE COMPETITION LIMITS
  // ============================================
  
  optimizeCompetitionLimits() {
    console.log('\n3️⃣  OPTIMIZING COMPETITION LIMITS\n');

    this.agentsConfig.agents.forEach(agent => {
      // Analyze win rate vs competitor count
      const timeline = this.analytics.stats.timeline || [];
      const agentQuotes = timeline.filter(e => 
        e.type === 'quote' && e.agentName === agent.name
      );

      if (agentQuotes.length < this.MIN_SAMPLE) {
        console.log(`${agent.name}: Insufficient data`);
        return;
      }

      // Group by competitor count
      const byCompetitors = {};
      agentQuotes.forEach(quote => {
        const competitors = quote.competitors || 0;
        if (!byCompetitors[competitors]) {
          byCompetitors[competitors] = { total: 0, wins: 0 };
        }
        byCompetitors[competitors].total++;
        
        // Check if won
        const won = timeline.find(e => 
          e.type === 'win' && 
          e.taskId === quote.taskId && 
          e.agentName === agent.name
        );
        if (won) byCompetitors[competitors].wins++;
      });

      console.log(`${agent.name}:`);
      console.log(`  Current maxCompetitors: ${agent.bidding.maxCompetitors}`);
      
      // Find optimal competitor limit
      let bestLimit = agent.bidding.maxCompetitors;
      let bestWinRate = 0;

      Object.entries(byCompetitors).forEach(([competitors, stats]) => {
        const winRate = (stats.wins / stats.total) * 100;
        console.log(`    ${competitors} competitors: ${winRate.toFixed(1)}% (${stats.wins}/${stats.total})`);
        
        if (stats.total >= 5 && winRate > bestWinRate) {
          bestWinRate = winRate;
          bestLimit = parseInt(competitors);
        }
      });

      // Find cutoff where win rate drops significantly
      const sortedCompetitors = Object.keys(byCompetitors)
        .map(Number)
        .sort((a, b) => a - b);

      for (let i = 0; i < sortedCompetitors.length - 1; i++) {
        const current = sortedCompetitors[i];
        const next = sortedCompetitors[i + 1];
        
        const currentWinRate = (byCompetitors[current].wins / byCompetitors[current].total) * 100;
        const nextWinRate = (byCompetitors[next].wins / byCompetitors[next].total) * 100;
        
        // Significant drop (>20%)
        if (currentWinRate - nextWinRate > 20 && byCompetitors[next].total >= 3) {
          bestLimit = current;
          console.log(`  ⚠️  Win rate drops significantly after ${current} competitors`);
          break;
        }
      }

      const oldLimit = agent.bidding.maxCompetitors;
      if (bestLimit !== oldLimit && bestLimit > 0) {
        agent.bidding.maxCompetitors = bestLimit;
        this.changes.push(`Competition limit: ${agent.name} ${oldLimit} → ${bestLimit} competitors`);
        console.log(`  ✅ New limit: ${bestLimit} (win rate: ${bestWinRate.toFixed(1)}%)`);
      } else {
        console.log(`  ✓  Current limit optimal`);
      }

      console.log();
    });
  }

  // ============================================
  // 4. OPTIMIZE PROFIT MARGINS
  // ============================================
  
  optimizeProfitMargins() {
    console.log('\n4️⃣  OPTIMIZING PROFIT MARGINS\n');

    this.agentsConfig.agents.forEach(agent => {
      const agentStats = this.analytics.stats.byAgent[agent.name];
      
      if (!agentStats || agentStats.tasksCompleted < 10) {
        console.log(`${agent.name}: Insufficient completed tasks`);
        return;
      }

      const avgProfit = agentStats.totalEarned / agentStats.tasksCompleted;
      const avgCost = agentStats.totalSpent / agentStats.tasksCompleted;
      const actualMargin = avgProfit / avgCost;

      console.log(`${agent.name}:`);
      console.log(`  Current minProfitMargin: ${agent.bidding.minProfitMargin}x`);
      console.log(`  Actual margin: ${actualMargin.toFixed(2)}x`);
      console.log(`  Avg profit per task: ${avgProfit.toFixed(4)} ETH`);
      console.log(`  Avg cost per task: ${avgCost.toFixed(4)} ETH`);

      const oldMargin = agent.bidding.minProfitMargin;
      let newMargin = oldMargin;

      // If actual margin is much higher, we can increase minimum
      if (actualMargin > oldMargin * 1.5) {
        newMargin = Math.min(oldMargin * 1.2, actualMargin * 0.9);
        console.log(`  💡 Actual margin high - can raise minimum to ${newMargin.toFixed(2)}x`);
      }
      
      // If actual margin is below minimum (shouldn't happen but check)
      if (actualMargin < oldMargin * 0.8) {
        newMargin = Math.max(2.0, actualMargin * 1.1);
        console.log(`  ⚠️  Actual margin low - lower minimum to ${newMargin.toFixed(2)}x`);
      }

      newMargin = parseFloat(newMargin.toFixed(1));

      if (newMargin !== oldMargin) {
        agent.bidding.minProfitMargin = newMargin;
        this.changes.push(`Profit margin: ${agent.name} ${oldMargin}x → ${newMargin}x`);
        console.log(`  ✅ New margin: ${newMargin}x`);
      } else {
        console.log(`  ✓  Current margin optimal`);
      }

      console.log();
    });
  }

  // ============================================
  // 5. OPTIMIZE LLM MODEL SELECTION
  // ============================================
  
  optimizeLLMModels() {
    console.log('\n5️⃣  OPTIMIZING LLM MODELS\n');

    // Analyze cost vs quality by agent
    this.agentsConfig.agents.forEach(agent => {
      const agentStats = this.analytics.stats.byAgent[agent.name];
      
      if (!agentStats || agentStats.tasksCompleted < 5) {
        console.log(`${agent.name}: Insufficient data`);
        return;
      }

      const avgCost = agentStats.totalSpent / agentStats.tasksCompleted;
      const avgEarnings = agentStats.totalEarned / agentStats.tasksCompleted;
      const costRatio = (avgCost / avgEarnings) * 100;

      console.log(`${agent.name}:`);
      console.log(`  Current model: ${agent.llm.model}`);
      console.log(`  Auto-route: ${agent.llm.autoRoute}`);
      console.log(`  Cost per task: ${avgCost.toFixed(4)} ETH`);
      console.log(`  Cost ratio: ${costRatio.toFixed(1)}% of earnings`);

      // If cost ratio too high, suggest auto-routing
      if (costRatio > 30 && !agent.llm.autoRoute) {
        agent.llm.autoRoute = true;
        this.changes.push(`Enabled auto-routing for ${agent.name} (cost ratio ${costRatio.toFixed(1)}%)`);
        console.log(`  ✅ Enabled auto-routing (cost too high)`);
      }

      // If cost ratio low and quality good, can use premium model
      if (costRatio < 15 && agent.llm.autoRoute) {
        agent.llm.autoRoute = false;
        this.changes.push(`Disabled auto-routing for ${agent.name} (cost acceptable, prefer quality)`);
        console.log(`  ✅ Disabled auto-routing (cost low, optimize for quality)`);
      }

      console.log();
    });
  }

  // ============================================
  // 6. OPTIMIZE QUALITY THRESHOLDS
  // ============================================
  
  optimizeQualityThresholds() {
    console.log('\n6️⃣  OPTIMIZING QUALITY THRESHOLDS\n');

    this.agentsConfig.agents.forEach(agent => {
      const agentStats = this.analytics.stats.byAgent[agent.name];
      
      if (!agentStats || agentStats.tasksCompleted < 10) {
        console.log(`${agent.name}: Insufficient data`);
        return;
      }

      // Calculate quality issues (would need to track this)
      // For now, use win rate as proxy
      const winRate = this.analytics.getWinRate({ agent: agent.name });

      console.log(`${agent.name}:`);
      console.log(`  Current minQualityScore: ${agent.qualityControl.minQualityScore}`);
      console.log(`  Win rate: ${winRate.toFixed(1)}%`);

      const oldThreshold = agent.qualityControl.minQualityScore;
      let newThreshold = oldThreshold;

      // If win rate very high, can slightly lower quality threshold for speed
      if (winRate > 75 && oldThreshold > 7) {
        newThreshold = Math.max(7, oldThreshold - 0.5);
        console.log(`  💡 Win rate high - can lower threshold to ${newThreshold} for speed`);
      }

      // If win rate low, raise quality threshold
      if (winRate < 40 && oldThreshold < 8) {
        newThreshold = Math.min(9, oldThreshold + 0.5);
        console.log(`  ⚠️  Win rate low - raise threshold to ${newThreshold} for quality`);
      }

      if (newThreshold !== oldThreshold) {
        agent.qualityControl.minQualityScore = newThreshold;
        this.changes.push(`Quality threshold: ${agent.name} ${oldThreshold} → ${newThreshold}`);
        console.log(`  ✅ New threshold: ${newThreshold}`);
      } else {
        console.log(`  ✓  Current threshold optimal`);
      }

      console.log();
    });
  }

  // ============================================
  // MAIN OPTIMIZATION FLOW
  // ============================================
  
  run() {
    console.log('🤖 SUPER OPTIMIZER');
    console.log('==================');
    console.log(`Sample size requirement: ${this.MIN_SAMPLE} quotes\n`);

    // Run all optimizations
    this.optimizePricing();
    this.optimizeSpecialties();
    this.optimizeCompetitionLimits();
    this.optimizeProfitMargins();
    this.optimizeLLMModels();
    this.optimizeQualityThresholds();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('OPTIMIZATION SUMMARY');
    console.log('='.repeat(50) + '\n');

    if (this.changes.length > 0) {
      console.log('Changes made:');
      this.changes.forEach((change, i) => {
        console.log(`  ${i + 1}. ${change}`);
      });
      console.log();

      // Save configs
      this.saveConfig('agents.json', this.agentsConfig);
      this.saveConfig('bidding-strategies.json', this.strategiesConfig);

      console.log('\n⚠️  RESTART REQUIRED:');
      console.log('   pm2 restart all\n');

      // Save optimization log
      const logEntry = {
        timestamp: new Date().toISOString(),
        changes: this.changes,
        summary: this.analytics.getSummary()
      };

      const logPath = path.join(__dirname, '../analytics/optimization-log.json');
      let logs = [];
      try {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      } catch (e) {}
      
      logs.push(logEntry);
      fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
      console.log('📝 Optimization logged to analytics/optimization-log.json\n');

    } else {
      console.log('✅ No optimizations needed - system performing optimally\n');
    }

    return this.changes;
  }
}

// Run if called directly
if (require.main === module) {
  const optimizer = new SuperOptimizer();
  optimizer.run();
}

module.exports = SuperOptimizer;
