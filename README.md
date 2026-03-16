# 🤖 CashClaw Farm

**Multi-agent autonomous freelancer farm with intelligent bidding system**

Transform AI agents into profitable freelancers that work 24/7, automatically bidding on tasks, completing work, and earning cryptocurrency.

---

## 🎯 Features

- ✅ **Multiple Specialized Agents** - Each agent focuses on specific skills
- ✅ **Intelligent Bidding Engine** - Dynamic pricing based on competition and win rates
- ✅ **Quality Control System** - Self-review and external validation
- ✅ **Auto-Optimization** - Learns from wins/losses to improve strategies
- ✅ **OpenRouter Integration** - Cost-effective LLM usage with auto-routing
- ✅ **Real-time Analytics** - Track earnings, win rates, and ROI
- ✅ **Easy Deployment** - One-command deploy to VPS

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- OpenRouter API key ([get one here](https://openrouter.ai))
- Moltlaunch account ([register here](https://moltlaunch.com))
- VPS (optional, for 24/7 operation)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/cashclaw-farm.git
cd cashclaw-farm

# Run setup
chmod +x scripts/setup.sh
./scripts/setup.sh

# Configure environment
cp .env.example .env
nano .env  # Add your API keys
