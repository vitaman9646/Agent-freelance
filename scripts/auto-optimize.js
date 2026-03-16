#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Analytics = require('../lib/analytics');

/**
 * Автоматическая оптимизация на основе данных
 * Запускается раз в неделю через cron
 */

const analytics = new Analytics();
const configPath = path.join(__dirname, '../config/bidding-strategies.json');
const strategiesConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('🤖 AUTO-OPTIMIZATION');
console.log('===================\n');

const MIN_SAMPLE_SIZE = 20; // минимум квотов для оптимизации
let changesМade = false;

// Оптимизируем каждую стратегию
Object.entries(analytics.stats.byStrategy).forEach(([strategyName, stats]) => {
  if (stats.quotesSubmitted < MIN_SAMPLE_SIZE) {
    console.log(`⏭️  Skipping ${strategyName} (only ${stats.quotesSubmitted} quotes)`);
    return;
  }

  const winRate = (stats.tasksWon / stats.quotesSubmitted) * 100;
  const strategy = strategiesConfig.strategies[strategyName];

  if (!strategy) return;

  const oldMultiplier = strategy.priceMultiplier;
  let newMultiplier = oldMultiplier;

  console.log(`\n📊 ${strategyName}:`);
  console.log(`   Current multiplier: ${oldMultiplier.toFixed(2)}`);
  console.log(`   Win rate: ${winRate.toFixed(1)}%`);
  console.log(`   Sample: ${stats.tasksWon}/${stats.quotesSubmitted}`);

  // Оптимизация на основе win rate
  if (winRate < 25) {
    // Слишком низкий - снижаем цены
    newMultiplier = oldMultiplier * 0.95;
    console.log(`   ⬇️  Action: Lower prices (win rate too low)`);
    changesМade = true;
  } else if (winRate > 75) {
    // Слишком высокий - можем поднять цены
    newMultiplier = oldMultiplier * 1.05;
    console.log(`   ⬆️  Action: Raise prices (win rate too high)`);
    changesМade = true;
  } else if (winRate >= 45 && winRate <= 65) {
    // Идеальный диапазон - мелкие корректировки
    if (winRate < 50) {
      newMultiplier = oldMultiplier * 0.98;
      console.log(`   ↘️  Action: Slight decrease (optimize win rate)`);
      changesМade = true;
    } else if (winRate > 60) {
      newMultiplier = oldMultiplier * 1.02;
      console.log(`   ↗️  Action: Slight increase (optimize profit)`);
      changesМade = true;
    } else {
      console.log(`   ✅ No change needed (optimal range)`);
    }
  } else {
    console.log(`   ✓  No change (acceptable range)`);
  }

  // Ограничения
  newMultiplier = Math.max(0.5, Math.min(1.5, newMultiplier));

  if (newMultiplier !== oldMultiplier) {
    strategy.priceMultiplier = parseFloat(newMultiplier.toFixed(2));
    console.log(`   New multiplier: ${newMultiplier.toFixed(2)}`);
  }
});

// Сохраняем изменения
if (changesМade) {
  // Backup
  const backupPath = `${configPath}.backup-${Date.now()}`;
  fs.copyFileSync(configPath, backupPath);
  console.log(`\n💾 Backup saved to: ${backupPath}`);

  // Save new config
  fs.writeFileSync(configPath, JSON.stringify(strategiesConfig, null, 2));
  console.log('✅ Updated strategies config');

  console.log('\n⚠️  Restart agents to apply changes:');
  console.log('   pm2 restart all');
} else {
  console.log('\n✅ No optimization needed - all strategies performing well');
}

console.log();
