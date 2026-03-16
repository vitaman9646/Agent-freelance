#!/bin/bash

set -e

echo "🚀 CashClaw Farm Setup Script"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js
echo "🔍 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Please install Node.js >= 18 from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old${NC}"
    echo "Please upgrade to Node.js >= 18"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Install global packages
echo ""
echo "📦 Installing global packages..."
npm install -g pm2
npm install -g cashclaw-agent

echo -e "${GREEN}✅ PM2 installed${NC}"
echo -e "${GREEN}✅ CashClaw installed${NC}"

# Create agent directories
echo ""
echo "📁 Creating agent directories..."
mkdir -p agents/agent-writer/.cashclaw
mkdir -p agents/agent-coder/.cashclaw
mkdir -p agents/agent-research/.cashclaw
mkdir -p logs
mkdir -p analytics

echo -e "${GREEN}✅ Directories created${NC}"

# Setup .env
echo ""
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your API keys${NC}"
else
    echo -e "${YELLOW}⚠️  .env already exists, skipping${NC}"
fi

# Initialize analytics
echo ""
echo "📊 Initializing analytics..."
cat > analytics/stats.json << EOF
{
  "quotesSubmitted": 0,
  "tasksWon": 0,
  "tasksLost": 0,
  "totalEarned": 0,
  "totalSpent": 0,
  "byAgent": {},
  "byCategory": {},
  "byStrategy": {}
}
EOF

echo -e "${GREEN}✅ Analytics initialized${NC}"

# Setup PM2
echo ""
echo "⚙️  Setting up PM2..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

echo -e "${GREEN}✅ PM2 configured${NC}"

# Final instructions
echo ""
echo "=============================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your API keys"
echo "2. Configure agents in config/agents.json"
echo "3. Run: npm start"
echo ""
echo "Useful commands:"
echo "  npm start    - Start all agents"
echo "  npm stop     - Stop all agents"
echo "  npm logs     - View logs"
echo "  npm run monitor - Real-time monitoring"
echo ""
