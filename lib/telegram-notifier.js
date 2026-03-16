const fetch = require('node-fetch');

class TelegramNotifier {
  constructor(botToken, chatId) {
    this.botToken = 8612211782:AAGMpTU6bjdoN3-z_BA0xcIikyefb8WrmQE;
    this.chatId = 1066756284;
    this.baseURL = `https://api.telegram.org/bot${botToken}`;
  }

  async send(message) {
    if (!this.botToken || !this.chatId) {
      console.log('Telegram not configured, skipping notification');
      return;
    }

    try {
      const response = await fetch(`${this.baseURL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        console.error('Telegram notification failed:', await response.text());
      }
    } catch (error) {
      console.error('Telegram error:', error);
    }
  }

  async notifyNewTask(task, evaluation) {
    const message = `
🎯 *New Task Found*

*Category:* ${task.category}
*Budget:* ${task.budget} ETH
*Competition:* ${task.quotesCount} quotes

*Our Evaluation:*
Should bid: ${evaluation.shouldBid ? '✅ Yes' : '❌ No'}
${evaluation.shouldBid ? `
Recommended price: ${evaluation.recommendedPrice} ETH
Win probability: ${(evaluation.winProbability * 100).toFixed(1)}%
Profit estimate: ${evaluation.estimatedProfit.toFixed(4)} ETH
` : `Reason: ${evaluation.reason}`}
`;

    await this.send(message);
  }

  async notifyTaskWon(task, quote) {
    const message = `
🎉 *Task Won!*

*Category:* ${task.category}
*Price:* ${quote.price} ETH
*Strategy:* ${quote.strategy}

Now working on it...
`;

    await this.send(message);
  }

  async notifyTaskCompleted(task, earnings, cost) {
    const profit = earnings - cost;
    const message = `
✅ *Task Completed*

*Category:* ${task.category}
*Earned:* ${earnings.toFixed(4)} ETH
*Cost:* ${cost.toFixed(4)} ETH
*Profit:* ${profit.toFixed(4)} ETH
*ROI:* ${((profit/cost)*100).toFixed(1)}%
`;

    await this.send(message);
  }

  async notifyError(error, context) {
    const message = `
⚠️ *Error Occurred*

*Context:* ${context}
*Error:* ${error.message}

Check logs for details.
`;

    await this.send(message);
  }

  async notifyDailySummary(summary) {
    const message = `
📊 *Daily Summary*

*Today:*
Quotes: ${summary.quotesSubmitted}
Won: ${summary.tasksWon} (${summary.winRate})
Earned: ${summary.totalEarned} ETH
Profit: ${summary.profit} ETH

*Overall:*
Total tasks: ${summary.totalCompleted}
Win rate: ${summary.overallWinRate}
Total profit: ${summary.totalProfit} ETH
`;

    await this.send(message);
  }
}

module.exports = TelegramNotifier;
