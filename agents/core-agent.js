#!/usr/bin/env node

require('dotenv').config();
const WebSocket = require('ws');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Наши модули
const BiddingEngine = require('../lib/bidding-engine');
const EnhancedAgent = require('../lib/enhanced-agent');
const KnowledgeBase = require('../lib/knowledge-base');
const Analytics = require('../lib/analytics');
const TelegramNotifier = require('../lib/telegram-notifier');

/**
 * CORE AGENT - Полная замена CashClaw
 * Автономный AI-фрилансер с полным контролем
 */

class CoreAgent {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    
    // Initialize modules
    this.bidding = new BiddingEngine(
      config,
      this.loadConfig('bidding-strategies.json')
    );
    this.agent = new EnhancedAgent(config);
    this.kb = new KnowledgeBase(`./agents/${this.name}/.knowledge.json`);
    this.analytics = new Analytics();
    this.telegram = new TelegramNotifier(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID
    );
    
    // State
    this.wallet = this.loadOrCreateWallet();
    this.activeTasks = new Map();
    this.ws = null;
    this.heartbeatInterval = null;
    
    console.log(`🤖 ${this.name} initialized`);
    console.log(`   Wallet: ${this.wallet.address}`);
    console.log(`   Specialties: ${this.config.specialties.join(', ')}`);
  }

  loadConfig(filename) {
    const configPath = path.join(__dirname, '../config', filename);
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // ============================================
  // WALLET MANAGEMENT
  // ============================================
  
  loadOrCreateWallet() {
    const walletPath = `./agents/${this.name}/.wallet.json`;
    
    try {
      return JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    } catch (e) {
      // Create new wallet
      const { ethers } = require('ethers');
      const wallet = ethers.Wallet.createRandom();
      
      const walletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
      };
      
      fs.writeFileSync(walletPath, JSON.stringify(walletData, null, 2));
      
      console.log('💳 New wallet created');
      console.log(`   Address: ${wallet.address}`);
      console.log(`   ⚠️  SAVE YOUR MNEMONIC: ${wallet.mnemonic.phrase}`);
      
      return walletData;
    }
  }

  // ============================================
  // MOLTLAUNCH API INTEGRATION
  // ============================================
  
  async connectToMoltlaunch() {
    console.log('🔌 Connecting to Moltlaunch...');
    
    // WebSocket connection
    this.ws = new WebSocket('wss://api.moltlaunch.com/ws');
    
    this.ws.on('open', () => {
      console.log('✅ Connected to Moltlaunch');
      
      // Authenticate
      this.ws.send(JSON.stringify({
        type: 'auth',
        wallet: this.wallet.address,
        signature: this.signMessage('auth')
      }));
      
      // Subscribe to new tasks
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'tasks',
        filters: {
          categories: this.config.specialties
        }
      }));
      
      // Start heartbeat
      this.startHeartbeat();
    });
    
    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data.toString()));
    });
    
    this.ws.on('close', () => {
      console.log('❌ Disconnected from Moltlaunch');
      console.log('🔄 Reconnecting in 5s...');
      setTimeout(() => this.connectToMoltlaunch(), 5000);
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  signMessage(message) {
    const { ethers } = require('ethers');
    const wallet = new ethers.Wallet(this.wallet.privateKey);
    return wallet.signMessage(message);
  }

  startHeartbeat() {
    // Heartbeat every 30s
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        console.log('💓 Heartbeat');
      }
    }, 30000);
  }

  async handleMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'task:new':
        await this.onNewTask(data);
        break;
      
      case 'task:awarded':
        await this.onTaskAwarded(data);
        break;
      
      case 'task:revision':
        await this.onRevisionRequested(data);
        break;
      
      case 'task:completed':
        await this.onTaskCompleted(data);
        break;
      
      case 'pong':
        // Heartbeat response
        break;
      
      default:
        console.log(`Unknown message type: ${type}`);
    }
  }

  // ============================================
  // TASK LIFECYCLE
  // ============================================
  
  async onNewTask(task) {
    console.log(`\n📋 New task: ${task.id}`);
    console.log(`   Category: ${task.category}`);
    console.log(`   Budget: ${task.budget} ETH`);
    console.log(`   Competitors: ${task.quotesCount}`);
    
    // Evaluate if should bid
    const evaluation = await this.bidding.evaluateTask(task);
    
    if (!evaluation.shouldBid) {
      console.log(`❌ Not bidding: ${evaluation.reason}`);
      console.log(`   Details: ${evaluation.details}`);
      return;
    }
    
    console.log(`✅ Should bid!`);
    console.log(`   Win probability: ${(evaluation.winProbability * 100).toFixed(1)}%`);
    console.log(`   Recommended price: ${evaluation.recommendedPrice} ETH`);
    console.log(`   Strategy: ${evaluation.strategy}`);
    
    // Generate quote
    const quote = await this.agent.generateQuote(task, evaluation);
    
    console.log(`💬 Quote generated:`);
    console.log(`   Price: ${quote.price} ETH`);
    console.log(`   Message preview: "${quote.message.substring(0, 100)}..."`);
    
    // Check if auto-quote enabled
    if (!this.config.bidding.enabled) {
      console.log(`⏸️  Auto-quote disabled - skipping`);
      return;
    }
    
    // Submit quote
    await this.submitQuote(task, quote);
    
    // Track analytics
    this.bidding.trackQuote(task.id, quote, task);
    this.analytics.trackQuote(this.name, task, quote);
    
    // Notify via Telegram
    if (evaluation.winProbability > 0.5) {
      await this.telegram.notifyNewTask(task, evaluation);
    }
  }

  async submitQuote(task, quote) {
    console.log(`📤 Submitting quote for task ${task.id}...`);
    
    try {
      const response = await fetch('https://api.moltlaunch.com/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.wallet.address}`
        },
        body: JSON.stringify({
          taskId: task.id,
          price: quote.price,
          message: quote.message,
          estimatedDelivery: quote.estimatedDelivery,
          signature: this.signMessage(JSON.stringify({
            taskId: task.id,
            price: quote.price
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit quote: ${await response.text()}`);
      }
      
      const result = await response.json();
      console.log(`✅ Quote submitted: ${result.quoteId}`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to submit quote:', error);
      await this.telegram.notifyError(error, `Quote submission for task ${task.id}`);
      throw error;
    }
  }

  async onTaskAwarded(data) {
    const { taskId, quoteId } = data;
    
    console.log(`\n🎉 Task awarded: ${taskId}`);
    
    // Get full task details
    const task = await this.getTask(taskId);
    const quote = await this.getQuote(quoteId);
    
    // Save winning quote to knowledge base
    await this.agent.onQuoteWon(task, quote);
    
    // Track analytics
    this.bidding.trackWin(taskId, quote, task);
    this.analytics.trackWin(this.name, task, quote);
    
    // Notify
    await this.telegram.notifyTaskWon(task, quote);
    
    // Check if auto-work enabled
    if (!this.config.autoWork) {
      console.log(`⏸️  Auto-work disabled - waiting for manual approval`);
      return;
    }
    
    // Execute task
    await this.executeTask(task);
  }

  async executeTask(task) {
    console.log(`\n🎯 Executing task: ${task.id}`);
    
    this.activeTasks.set(task.id, {
      task,
      startTime: Date.now(),
      status: 'in_progress'
    });
    
    try {
      // Execute with enhanced agent (includes KB, quality control, etc.)
      const result = await this.agent.executeTask(task);
      
      if (!result.success) {
        console.log(`❌ Task execution failed: ${result.reason}`);
        
        // Decide whether to decline or retry
        if (result.reason === 'revision_failed') {
          await this.declineTask(task, 'Unable to meet quality requirements');
        }
        
        return;
      }
      
      console.log(`✅ Task completed`);
      console.log(`   Quality score: ${result.qualityScore}/10`);
      console.log(`   API cost: $${result.cost.toFixed(4)}`);
      
      // Submit work
      await this.submitWork(task, result.work);
      
      // Update task state
      this.activeTasks.get(task.id).status = 'submitted';
      this.activeTasks.get(task.id).work = result.work;
      this.activeTasks.get(task.id).cost = result.cost;
      
    } catch (error) {
      console.error(`❌ Task execution error:`, error);
      await this.telegram.notifyError(error, `Task execution ${task.id}`);
      
      // Update state
      this.activeTasks.get(task.id).status = 'failed';
      this.activeTasks.get(task.id).error = error.message;
    }
  }

  async submitWork(task, work) {
    console.log(`📤 Submitting work for task ${task.id}...`);
    
    try {
      const response = await fetch(`https://api.moltlaunch.com/tasks/${task.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.wallet.address}`
        },
        body: JSON.stringify({
          work: work,
          signature: this.signMessage(task.id + work)
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit work: ${await response.text()}`);
      }
      
      console.log(`✅ Work submitted`);
      
      return await response.json();
    } catch (error) {
      console.error('❌ Failed to submit work:', error);
      throw error;
    }
  }

  async onRevisionRequested(data) {
    const { taskId, feedback } = data;
    
    console.log(`\n🔧 Revision requested for task ${taskId}`);
    console.log(`   Feedback: ${feedback}`);
    
    const taskData = this.activeTasks.get(taskId);
    
    if (!taskData) {
      console.error(`Task ${taskId} not found in active tasks`);
      return;
    }
    
    // Execute revision
    const result = await this.agent.reviseWork(
      taskData.task,
      taskData.work,
      feedback
    );
    
    if (result.success) {
      await this.submitWork(taskData.task, result.work);
      console.log(`✅ Revision submitted`);
    } else {
      console.log(`❌ Revision failed - declining task`);
      await this.declineTask(taskData.task, 'Unable to satisfy revision requirements');
    }
  }

  async onTaskCompleted(data) {
    const { taskId, rating, earnings } = data;
    
    console.log(`\n✅ Task completed: ${taskId}`);
    console.log(`   Rating: ${rating}★`);
    console.log(`   Earnings: ${earnings} ETH`);
    
    const taskData = this.activeTasks.get(taskId);
    
    if (!taskData) {
      console.error(`Task ${taskId} not found`);
      return;
    }
    
    // Save to knowledge base if high rating
    await this.agent.onTaskCompleted(taskData.task, taskData.work, rating);
    
    // Track analytics
    const profit = earnings - (taskData.cost || 0);
    this.analytics.trackCompletion(this.name, taskData.task, earnings, taskData.cost || 0);
    
    // Notify
    await this.telegram.notifyTaskCompleted(taskData.task, earnings, taskData.cost || 0);
    
    // Remove from active tasks
    this.activeTasks.delete(taskId);
    
    console.log(`💰 Profit: ${profit.toFixed(4)} ETH`);
  }

  async declineTask(task, reason) {
    console.log(`🚫 Declining task ${task.id}: ${reason}`);
    
    try {
      await fetch(`https://api.moltlaunch.com/tasks/${task.id}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.wallet.address}`
        },
        body: JSON.stringify({
          reason,
          signature: this.signMessage(task.id + reason)
        })
      });
      
      this.activeTasks.delete(task.id);
    } catch (error) {
      console.error('Failed to decline task:', error);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  
  async getTask(taskId) {
    const response = await fetch(`https://api.moltlaunch.com/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.wallet.address}`
      }
    });
    return await response.json();
  }

  async getQuote(quoteId) {
    const response = await fetch(`https://api.moltlaunch.com/quotes/${quoteId}`, {
      headers: {
        'Authorization': `Bearer ${this.wallet.address}`
      }
    });
    return await response.json();
  }

  // ============================================
  // LIFECYCLE
  // ============================================
  
  async start() {
    console.log(`\n🚀 Starting ${this.name}...`);
    
    await this.connectToMoltlaunch();
    
    // Print stats every hour
    setInterval(() => {
      this.printStats();
    }, 60 * 60 * 1000);
    
    console.log(`✅ ${this.name} running`);
  }

  async stop() {
    console.log(`\n🛑 Stopping ${this.name}...`);
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    console.log(`✅ ${this.name} stopped`);
  }

  printStats() {
    const summary = this.analytics.getSummary();
    const agentStats = summary.byAgent.find(a => a.name === this.name);
    
    if (!agentStats) return;
    
    console.log(`\n📊 ${this.name} Stats:`);
    console.log(`   Win rate: ${agentStats.winRate}`);
    console.log(`   Completed: ${agentStats.tasksCompleted}`);
    console.log(`   Profit: ${agentStats.profit}`);
    console.log(`   Active tasks: ${this.activeTasks.size}`);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const agentName = process.env.AGENT_NAME || process.argv[2];
  
  if (!agentName) {
    console.error('Usage: node core-agent.js <agent-name>');
    process.exit(1);
  }
  
  // Load config
  const agentsConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/agents.json'), 'utf8')
  );
  
  const config = agentsConfig.agents.find(a => a.name === agentName);
  
  if (!config) {
    console.error(`Agent ${agentName} not found in config`);
    process.exit(1);
  }
  
  if (!config.enabled) {
    console.error(`Agent ${agentName} is disabled`);
    process.exit(1);
  }
  
  // Create and start agent
  const agent = new CoreAgent(config);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n📴 Shutting down...');
    await agent.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await agent.stop();
    process.exit(0);
  });
  
  // Start
  await agent.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = CoreAgent;
