const fs = require('fs');
const path = require('path');

/**
 * Knowledge Base - хранит успешные примеры работ
 * Агент учится на своих лучших результатах
 */

class KnowledgeBase {
  constructor(dbPath = './analytics/knowledge.json') {
    this.dbPath = dbPath;
    this.knowledge = this.load();
  }

  load() {
    try {
      return JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
    } catch (e) {
      return {
        successfulWorks: [],
        winningQuotes: [],
        bestPractices: []
      };
    }
  }

  save() {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.knowledge, null, 2));
  }

  // Добавить успешную работу
  addSuccessfulWork(task, work, rating) {
    if (rating >= 4.5) {
      this.knowledge.successfulWorks.push({
        timestamp: Date.now(),
        category: task.category,
        tags: task.tags,
        description: task.description,
        work: work,
        rating: rating
      });

      // Keep only last 50
      if (this.knowledge.successfulWorks.length > 50) {
        this.knowledge.successfulWorks = this.knowledge.successfulWorks.slice(-50);
      }

      this.save();
    }
  }

  // Добавить выигрышный quote
  addWinningQuote(task, quote, won) {
    if (won) {
      this.knowledge.winningQuotes.push({
        timestamp: Date.now(),
        category: task.category,
        budget: task.budget,
        competitors: task.quotesCount,
        quote: quote.message,
        price: quote.price,
        strategy: quote.strategy
      });

      if (this.knowledge.winningQuotes.length > 100) {
        this.knowledge.winningQuotes = this.knowledge.winningQuotes.slice(-100);
      }

      this.save();
    }
  }

  // Получить похожие успешные работы
  findSimilar(task, limit = 3) {
    return this.knowledge.successfulWorks
      .filter(work => 
        work.category === task.category ||
        work.tags?.some(tag => task.tags?.includes(tag))
      )
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  // Получить лучшие quote примеры для категории
  getBestQuotes(category, limit = 5) {
    return this.knowledge.winningQuotes
      .filter(q => q.category === category)
      .slice(-limit);
  }

  // Извлечь best practices
  extractBestPractices() {
    // Анализ выигрышных quotes
    const avgWinningPrice = this.knowledge.winningQuotes
      .reduce((sum, q) => sum + q.price, 0) / this.knowledge.winningQuotes.length;

    const popularStrategies = {};
    this.knowledge.winningQuotes.forEach(q => {
      popularStrategies[q.strategy] = (popularStrategies[q.strategy] || 0) + 1;
    });

    return {
      avgWinningPrice,
      mostSuccessfulStrategy: Object.entries(popularStrategies)
        .sort((a, b) => b[1] - a[1])[0]?.[0],
      totalSuccesses: this.knowledge.successfulWorks.length,
      avgRating: this.knowledge.successfulWorks
        .reduce((sum, w) => sum + w.rating, 0) / this.knowledge.successfulWorks.length
    };
  }
}

module.exports = KnowledgeBase;
