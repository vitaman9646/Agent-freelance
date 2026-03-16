module.exports = {
  apps: [
    {
      name: 'agent-writer',
      script: './agents/core-agent.js',
      args: 'agent-writer',
      cwd: './',
      env: {
        AGENT_NAME: 'agent-writer',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: './logs/agent-writer-error.log',
      out_file: './logs/agent-writer-out.log',
      time: true,
      autorestart: true
    },
    {
      name: 'agent-coder',
      script: './agents/core-agent.js',
      args: 'agent-coder',
      cwd: './',
      env: {
        AGENT_NAME: 'agent-coder',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: './logs/agent-coder-error.log',
      out_file: './logs/agent-coder-out.log',
      time: true,
      autorestart: true
    }
  ]
};
