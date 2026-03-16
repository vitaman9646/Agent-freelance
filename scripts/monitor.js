#!/usr/bin/env node

const Analytics = require('../lib/analytics');
const fs = require('fs');
const path = require('path');

const analytics = new Analytics();

function clearScreen() {
  console.clear();
}

function displayDashboard() {
  clearScreen();
  
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     🤖 CASHCLAW FARM DASHBOARD             ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log();
  
  analytics.printSummary();
  
  console.log('Press Ctrl+C to exit');
  console.log(`Last updated: ${new Date().toLocaleTimeString()}`);
}

// Initial display
displayDashboard();

// Update every 10 seconds
setInterval(displayDashboard, 10000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  process.exit(0);
});
