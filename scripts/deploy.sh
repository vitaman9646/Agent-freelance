#!/bin/bash

set -e

echo "🚀 CashClaw Farm Deployment Script"
echo "===================================="
echo ""

# Load environment
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

source .env

# Check required variables
if [ -z "$SERVER_IP" ]; then
    echo "❌ SERVER_IP not set in .env"
    exit 1
fi

if [ -z "$SSH_USER" ]; then
    echo "❌ SSH_USER not set in .env"
    exit 1
fi

echo "📡 Deploying to $SSH_USER@$SERVER_IP"
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=.cashclaw \
    --exclude=analytics \
    .

echo "✅ Package created"

# Upload to server
echo ""
echo "⬆️  Uploading to server..."
scp deploy.tar.gz $SSH_USER@$SERVER_IP:~/

echo "✅ Upload complete"

# Deploy on server
echo ""
echo "🔧 Deploying on server..."
ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
    set -e
    
    # Stop existing processes
    pm2 stop all || true
    
    # Backup old version
    if [ -d cashclaw-farm ]; then
        mv cashclaw-farm cashclaw-farm.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Extract new version
    mkdir -p cashclaw-farm
    tar -xzf deploy.tar.gz -C cashclaw-farm
    cd cashclaw-farm
    
    # Install dependencies
    npm install
    
    # Start agents
    pm2 start ecosystem.config.js
    pm2 save
    
    # Cleanup
    cd ..
    rm deploy.tar.gz
    
    echo "✅ Deployment complete"
    pm2 status
ENDSSH

# Cleanup local
rm deploy.tar.gz

echo ""
echo "===================================="
echo "✅ Deployment successful!"
echo ""
echo "Check status: ssh $SSH_USER@$SERVER_IP 'pm2 status'"
echo "View logs: ssh $SSH_USER@$SERVER_IP 'pm2 logs'"
echo ""
