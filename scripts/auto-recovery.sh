#!/bin/bash

# Проверка здоровья системы и автоматическое восстановление

# Проверка PM2 процессов
RUNNING=$(pm2 jlist | jq '[.[] | select(.pm2_env.status == "online")] | length')

if [ "$RUNNING" -lt 2 ]; then
    echo "[$(date)] Agents down - restarting" >> logs/auto-recovery.log
    pm2 restart all
    
    # Отправить в Telegram
    curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id=$TELEGRAM_CHAT_ID \
        -d text="🔄 Auto-recovery: Restarted agents"
fi

# Проверка disk space
DISK=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK" -gt 85 ]; then
    # Очистить старые логи
    find logs/ -name "*.log" -mtime +7 -delete
    find analytics/ -name "*.json.backup*" -mtime +30 -delete
    
    echo "[$(date)] Disk space cleaned" >> logs/auto-recovery.log
fi

# Проверка интернета
if ! ping -c 1 google.com &> /dev/null; then
    echo "[$(date)] Network issue detected" >> logs/auto-recovery.log
    # Попытка переподключения
    systemctl restart networking
fi
