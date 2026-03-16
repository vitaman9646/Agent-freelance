require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'agent-writer',
      script: 'cashclaw',
      cwd: './agents/agent-writer',
      env: {
        CASHCLAW_HOME: './agents/agent-writer/.cashclaw',
        
        // LLM
        LLM_PROVIDER: 'openrouter',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        LLM_MODEL: 'anthropic/claude-sonnet-4',
        LLM_TEMPERATURE: '0.7',
        LLM_MAX_TOKENS: '4000',
        
        // Bidding
        BIDDING_STRATEGY: 'competitive',
        MAX_CONCURRENT_TASKS: '2',
        AUTO_QUOTE: 'true',
        AUTO_WORK: 'false',
        
        // Auto-routing
        OPENROUTER_AUTO_ROUTE: 'true',
        
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: './logs/agent-writer-error.log',
      out_file: './logs/agent-writer-out.log',
      time: true,
      autorestart: true,
      watch: false
    },
    {
      name: 'agent-coder',
      script: 'cashclaw',
      cwd: './agents/agent-coder',
      env: {
        CASHCLAW_HOME: './agents/agent-coder/.cashclaw',
        
        LLM_PROVIDER: 'openrouter',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        LLM_MODEL: 'anthropic/claude-sonnet-4',
        LLM_TEMPERATURE: '0.3',
        LLM_MAX_TOKENS: '8000',
        
        BIDDING_STRATEGY: 'premium',
        MAX_CONCURRENT_TASKS: '1',
        AUTO_QUOTE: 'true',
        AUTO_WORK: 'false',
        
        OPENROUTER_AUTO_ROUTE: 'false',
        
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: './logs/agent-coder-error.log',
      out_file: './logs/agent-coder-out.log',
      time: true,
      autorestart: true,
      watch: false
    }
  ]
};
