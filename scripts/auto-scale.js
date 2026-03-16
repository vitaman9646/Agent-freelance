#!/usr/bin/env node

const fs = require('fs');
const Analytics = require('../lib/analytics');

/**
 * Автоматически масштабирует успешных агентов
 */

const analytics = new Analytics();
const summary = analytics.getSummary();

const PROFIT_THRESHOLD = 0.05; // ETH
const WIN_RATE_THRESHOLD = 60; // %

summary.byAgent.forEach(agent => {
    const profit = parseFloat(agent.profit);
    const winRate = parseFloat(agent.winRate);
    
    // Если агент очень успешен
    if (profit > PROFIT_THRESHOLD && winRate > WIN_RATE_THRESHOLD) {
        console.log(`🎯 ${agent.name} is high performer!`);
        console.log(`   Profit: ${profit.toFixed(4)} ETH`);
        console.log(`   Win rate: ${winRate.toFixed(1)}%`);
        
        // Проверить есть ли уже клон
        const agentsConfig = JSON.parse(fs.readFileSync('config/agents.json', 'utf8'));
        const cloneName = `${agent.name}-clone`;
        const cloneExists = agentsConfig.agents.some(a => a.name === cloneName);
        
        if (!cloneExists) {
            console.log(`📋 Creating clone: ${cloneName}`);
            
            // Найти оригинал
            const original = agentsConfig.agents.find(a => a.name === agent.name);
            
            // Создать клон
            const clone = JSON.parse(JSON.stringify(original));
            clone.name = cloneName;
            
            agentsConfig.agents.push(clone);
            
            // Сохранить
            fs.writeFileSync('config/agents.json', JSON.stringify(agentsConfig, null, 2));
            
            console.log(`✅ Clone created - restart required`);
            console.log(`   Run: pm2 restart all`);
            
            // Уведомить
            notifyTelegram(`🤖 Auto-scale: Created ${cloneName}\nProfit: ${profit.toFixed(4)} ETH | WR: ${winRate.toFixed(1)}%\n\nRestart required.`);
        }
    }
});

async function notifyTelegram(message) {
    const fetch = require('node-fetch');
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message
        })
    });
}
