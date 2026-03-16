#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs');

/**
 * Автоматически выводит прибыль когда достигнут порог
 */

const WITHDRAWAL_THRESHOLD = 0.1; // ETH
const TARGET_WALLET = process.env.MAIN_WALLET_ADDRESS;

async function checkAndWithdraw() {
    const agents = ['agent-writer', 'agent-coder'];
    
    for (const agentName of agents) {
        const walletPath = `./agents/${agentName}/.wallet.json`;
        const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
        
        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
        const wallet = new ethers.Wallet(walletData.privateKey, provider);
        
        const balance = await provider.getBalance(wallet.address);
        const balanceETH = ethers.formatEther(balance);
        
        console.log(`${agentName}: ${balanceETH} ETH`);
        
        if (parseFloat(balanceETH) >= WITHDRAWAL_THRESHOLD) {
            console.log(`💰 Withdrawing from ${agentName}...`);
            
            // Оставляем немного для gas
            const amountToWithdraw = balance - ethers.parseEther('0.001');
            
            const tx = await wallet.sendTransaction({
                to: TARGET_WALLET,
                value: amountToWithdraw
            });
            
            await tx.wait();
            
            console.log(`✅ Withdrawn ${ethers.formatEther(amountToWithdraw)} ETH`);
            console.log(`   TX: ${tx.hash}`);
            
            // Уведомление в Telegram
            await notifyTelegram(`💰 Auto-withdrawal: ${ethers.formatEther(amountToWithdraw)} ETH from ${agentName}\nTX: ${tx.hash}`);
        }
    }
}

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

checkAndWithdraw().catch(console.error);
