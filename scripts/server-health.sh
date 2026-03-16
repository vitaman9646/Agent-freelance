#!/bin/bash

# Health check script для запуска через cron

LOG_FILE="/home/cashclaw/cashclaw-farm/logs/health.log"

echo "[$(date)] Running health check..." >> $LOG_FILE

# Check if PM2 processes are running
PM2_STATUS=$(pm2 jlist)
RUNNING_COUNT=$(echo $PM2_STATUS | jq '[.[] | select(.pm2_env.status == "online")] | length')

if [ "$RUNNING_COUNT" -lt 2 ]; then
    echo "[$(date)] WARNING: Only $RUNNING_COUNT agents running!" >> $LOG_FILE
    pm2 restart all
    echo "[$(date)] Restarted all agents" >> $LOG_FILE
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "[$(date)] WARNING: Disk usage at ${DISK_USAGE}%!" >> $LOG_FILE
fi

# Check memory
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -gt 90 ]; then
    echo "[$(date)] WARNING: Memory usage at ${MEM_USAGE}%!" >> $LOG_FILE
fi

echo "[$(date)] Health check completed" >> $LOG_FILE
