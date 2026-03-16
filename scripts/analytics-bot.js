#!/usr/bin/env node

require('dotenv').config();
const Analytics = require('../lib/analytics');
const TelegramNotifier = require('../lib/telegram-notifier');
const OpenRouterClient = require('../lib/openrouter-client');
const fs = require('fs');
const path = require('path');

/**
 * ANALYTICS BOT
 * Автоматически анализирует данные и отправляет инсайты в Telegram
 */

class AnalyticsBot {
  constructor() {
    this.analytics = new Analytics();
    this.telegram = new TelegramNotifier(
      process.env.8612211782:AAGMpTU6bjdoN3-z_BA0xcIikyefb8WrmQE,
      process.env.1066756284
    );
    this.llm = new OpenRouterClient(process.env.OPENROUTER_API_KEY, {
      defaultModel: 'anthropic/claude-sonnet-4'
    });
  }

  // ============================================
  // ANALYZE DATA WITH LLM
  // ============================================
  
  async analyzeWithAI() {
    console.log('🧠 Analyzing data with AI...\n');

    const summary = this.analytics.getSummary();
    const timeline = this.analytics.stats.timeline || [];
    
    // Prepare data for LLM
    const dataForAnalysis = {
      overview: summary.overview,
      byAgent: summary.byAgent,
      byStrategy: summary.byStrategy,
      topCategories: summary.topCategories,
      recentEvents: timeline.slice(-20) // Last 20 events
    };

    const prompt = `You are a business analyst for an AI freelancing farm. Analyze this performance data and provide actionable insights.

DATA:
${JSON.stringify(dataForAnalysis, null, 2)}

Provide analysis in this format:

## 📊 Performance Summary
[1-2 sentences overall assessment]

## 🎯 Key Insights
1. [Most important insight]
2. [Second insight]
3. [Third insight]

## ⚠️ Issues Detected
- [Issue 1 if any]
- [Issue 2 if any]

## 💡 Recommendations
1. [Actionable recommendation]
2. [Another recommendation]
3. [Another recommendation]

## 📈 Projections
[Based on current data, project monthly earnings]

Keep it concise, actionable, and data-driven. Use emojis for readability.`;

    try {
      const response = await this.llm.chat([
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        maxTokens: 1500
      });

      return response.content;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return null;
    }
  }

  // ============================================
  // GENERATE DETAILED REPORT
  // ============================================
  
  async generateReport(type = 'daily') {
    console.log(`📊 Generating ${type} report...\n`);

    const summary = this.analytics.getSummary();
    const aiAnalysis = await this.analyzeWithAI();

    // Calculate time-based metrics
    const timeline = this.analytics.stats.timeline || [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const todayEvents = timeline.filter(e => e.timestamp > oneDayAgo);
    const weekEvents = timeline.filter(e => e.timestamp > oneWeekAgo);

    const todayQuotes = todayEvents.filter(e => e.type === 'quote').length;
    const todayWins = todayEvents.filter(e => e.type === 'win').length;
    const todayCompletions = todayEvents.filter(e => e.type === 'completion');
    
    const todayEarnings = todayCompletions.reduce((sum, e) => sum + (e.earnings || 0), 0);
    const todayProfit = todayCompletions.reduce((sum, e) => sum + (e.profit || 0), 0);

    // Build report
    let report = ``;

    if (type === 'daily') {
      report = `
📊 *Daily Report - ${new Date().toLocaleDateString()}*

*Today's Activity:*
Quotes submitted: ${todayQuotes}
Tasks won: ${todayWins}
Tasks completed: ${todayCompletions.length}
Earnings: ${todayEarnings.toFixed(4)} ETH
Profit: ${todayProfit.toFixed(4)} ETH

*Overall Stats:*
Total quotes: ${summary.overview.quotesSubmitted}
Win rate: ${summary.overview.winRate}
Total profit: ${summary.overview.profit}
ROI: ${summary.overview.roi}
`;
    } else if (type === 'weekly') {
      const weekQuotes = weekEvents.filter(e => e.type === 'quote').length;
      const weekWins = weekEvents.filter(e => e.type === 'win').length;
      const weekCompletions = weekEvents.filter(e => e.type === 'completion');
      const weekEarnings = weekCompletions.reduce((sum, e) => sum + (e.earnings || 0), 0);
      const weekProfit = weekCompletions.reduce((sum, e) => sum + (e.profit || 0), 0);

      report = `
📊 *Weekly Report*

*This Week:*
Quotes: ${weekQuotes}
Wins: ${weekWins} (${weekQuotes > 0 ? ((weekWins/weekQuotes)*100).toFixed(1) : 0}%)
Completed: ${weekCompletions.length}
Earnings: ${weekEarnings.toFixed(4)} ETH
Profit: ${weekProfit.toFixed(4)} ETH

*Top Performing Agent:*
${summary.byAgent.sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit))[0]?.name || 'N/A'}

*Best Category:*
${summary.topCategories[0]?.name || 'N/A'} (${summary.topCategories[0]?.winRate || '0%'})
`;
    }

    // Add AI analysis if available
    if (aiAnalysis) {
      report += `\n${aiAnalysis}`;
    }

    // Add agent breakdown
    if (summary.byAgent.length > 0) {
      report += `\n\n*Agent Performance:*\n`;
      summary.byAgent.forEach(agent => {
        report += `${agent.name}: ${agent.winRate} WR, ${agent.profit} profit\n`;
      });
    }

    return report;
  }

  // ============================================
  // DETECT ANOMALIES
  // ============================================
  
  detectAnomalies() {
    console.log('🔍 Detecting anomalies...\n');

    const anomalies = [];
    const summary = this.analytics.getSummary();

    // 1. Sudden drop in win rate
    const recentWinRate = this.calculateRecentWinRate(7); // Last 7 days
    const overallWinRate = parseFloat(summary.overview.winRate);
    
    if (recentWinRate < overallWinRate * 0.7) {
      anomalies.push({
        type: 'win_rate_drop',
        severity: 'high',
        message: `Win rate dropped from ${overallWinRate.toFixed(1)}% to ${recentWinRate.toFixed(1)}% recently`
      });
    }

    // 2. No quotes in last 24 hours
    const timeline = this.analytics.stats.timeline || [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentQuotes = timeline.filter(e => e.type === 'quote' && e.timestamp > oneDayAgo);
    
    if (recentQuotes.length === 0 && timeline.length > 10) {
      anomalies.push({
        type: 'no_activity',
        severity: 'critical',
        message: 'No quotes submitted in last 24 hours - check if agents are running'
      });
    }

    // 3. Negative profit trend
    const recentProfit = this.calculateRecentProfit(7);
    if (recentProfit < 0) {
      anomalies.push({
        type: 'negative_profit',
        severity: 'high',
        message: `Recent 7-day profit is negative: ${recentProfit.toFixed(4)} ETH`
      });
    }

    // 4. Agent stopped working
    summary.byAgent.forEach(agent => {
      const agentEvents = timeline.filter(e => e.agentName === agent.name);
      const recentAgentEvents = agentEvents.filter(e => e.timestamp > oneDayAgo);
      
      if (agentEvents.length > 5 && recentAgentEvents.length === 0) {
        anomalies.push({
          type: 'agent_inactive',
          severity: 'medium',
          message: `Agent ${agent.name} has no activity in last 24h`
        });
      }
    });

    return anomalies;
  }

  calculateRecentWinRate(days) {
    const timeline = this.analytics.stats.timeline || [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    const recentEvents = timeline.filter(e => e.timestamp > cutoff);
    const quotes = recentEvents.filter(e => e.type === 'quote').length;
    const wins = recentEvents.filter(e => e.type === 'win').length;
    
    return quotes > 0 ? (wins / quotes) * 100 : 0;
  }

  calculateRecentProfit(days) {
    const timeline = this.analytics.stats.timeline || [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    const completions = timeline.filter(e => 
      e.type === 'completion' && e.timestamp > cutoff
    );
    
    return completions.reduce((sum, e) => sum + (e.profit || 0), 0);
  }

  // ============================================
  // SEND REPORTS
  // ============================================
  
  async sendDailyReport() {
    console.log('📤 Sending daily report...\n');

    const report = await this.generateReport('daily');
    await this.telegram.send(report);
    
    // Check for anomalies
    const anomalies = this.detectAnomalies();
    if (anomalies.length > 0) {
      let alertMessage = '⚠️ *ALERTS*\n\n';
      anomalies.forEach(anomaly => {
        const emoji = anomaly.severity === 'critical' ? '🚨' : 
                     anomaly.severity === 'high' ? '⚠️' : 'ℹ️';
        alertMessage += `${emoji} ${anomaly.message}\n`;
      });
      await this.telegram.send(alertMessage);
    }

    console.log('✅ Daily report sent');
  }

  async sendWeeklyReport() {
    console.log('📤 Sending weekly report...\n');

    const report = await this.generateReport('weekly');
    await this.telegram.send(report);
    
    console.log('✅ Weekly report sent');
  }

  // ============================================
  // GENERATE RECOMMENDATIONS
  // ============================================
  
  async generateRecommendations() {
    console.log('💡 Generating recommendations...\n');

    const summary = this.analytics.getSummary();
    const optimizationLog = this.loadOptimizationLog();

    const prompt = `You are a strategy advisor for an AI freelancing business. Based on this data, provide 3-5 concrete, actionable recommendations for the next week.

CURRENT PERFORMANCE:
${JSON.stringify(summary, null, 2)}

RECENT OPTIMIZATIONS:
${JSON.stringify(optimizationLog.slice(-3), null, 2)}

Provide recommendations in this format:

*Recommendations for Next Week:*

1. **[Action Title]**
   Why: [Brief reason]
   How: [Specific steps]
   Expected impact: [Quantified if possible]

2. [Next recommendation]

etc.

Focus on:
- Increasing win rate
- Improving profitability
- Scaling successful strategies
- Fixing underperforming areas

Be specific and actionable.`;

    try {
      const response = await this.llm.chat([
        { role: 'user', content: prompt }
      ], {
        temperature: 0.4,
        maxTokens: 1000
      });

      return response.content;
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      return 'Unable to generate recommendations at this time.';
    }
  }

  loadOptimizationLog() {
    try {
      const logPath = path.join(__dirname, '../analytics/optimization-log.json');
      return JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } catch (e) {
      return [];
    }
  }

  async sendRecommendations() {
    console.log('📤 Sending recommendations...\n');

    const recommendations = await this.generateRecommendations();
    await this.telegram.send(recommendations);
    
    console.log('✅ Recommendations sent');
  }
}

// Run if called directly
if (require.main === module) {
  const action = process.argv[2] || 'daily';
  const bot = new AnalyticsBot();

  (async () => {
    try {
      if (action === 'daily') {
        await bot.sendDailyReport();
      } else if (action === 'weekly') {
        await bot.sendWeeklyReport();
      } else if (action === 'recommendations') {
        await bot.sendRecommendations();
      } else if (action === 'anomalies') {
        const anomalies = bot.detectAnomalies();
        console.log('Anomalies:', anomalies);
      } else {
        console.log('Usage: node analytics-bot.js [daily|weekly|recommendations|anomalies]');
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}

module.exports = AnalyticsBot;
