#!/bin/bash

# MASTER INTEGRATION SCRIPT
# Связывает все компоненты в единую систему

echo "🔗 MASTER INTEGRATION"
echo "===================="
echo ""

# 1. Setup Knowledge Base integration
echo "1. Setting up Knowledge Base..."
if [ ! -f "lib/enhanced-agent.js" ]; then
    echo "⚠️  Enhanced Agent not found"
    echo "Run: cp templates/enhanced-agent.js lib/"
fi

# 2. Setup Auto-optimizer
echo "2. Setting up Super Optimizer..."
(crontab -l 2>/dev/null | grep -v "super-optimizer"; echo "0 3 * * 0 cd $(pwd) && node scripts/super-optimizer.js >> logs/optimizer.log 2>&1 && pm2 restart all") | crontab -

# 3. Setup Analytics Bot
echo "3. Setting up Analytics Bot..."
(crontab -l 2>/dev/null | grep -v "analytics-bot"; echo "0 9 * * * cd $(pwd) && node scripts/analytics-bot.js daily") | crontab -
(crontab -l 2>/dev/null | grep -v "analytics-bot weekly"; echo "0 10 * * 0 cd $(pwd) && node scripts/analytics-bot.js weekly") | crontab -

# 4. Verify integration
echo ""
echo "4. Verifying integration..."

echo "   ✓ Cron jobs:"
crontab -l | grep -E "optimizer|analytics-bot"

echo ""
echo "===================="
echo "✅ Integration complete!"
echo ""
echo "Active automations:"
echo "  • Super Optimizer: Weekly (Sunday 3am)"
echo "  • Daily Analytics: Daily (9am)"
echo "  • Weekly Analytics: Sunday (10am)"
echo ""
echo "To enable Knowledge Base:"
echo "  1. Choose integration method (Fork/Wrapper/Middleware)"
echo "  2. Follow setup in docs/knowledge-base-integration.md"
echo ""
