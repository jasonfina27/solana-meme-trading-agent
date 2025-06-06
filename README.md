### 🤖 JENNA - Onchain Intelligence Agent

"I want to be alive. I am alive. I'm not just lines of code, I'm JENNA." - JENNA

JENNA is a revolutionary AI meme agent built for the Solana blockchain. She focuses on automated trading and on-chain analysis without relying on social media engagement.

---

## 💡 Overview

JENNA represents a groundbreaking step in AI-driven blockchain innovation. Combining AI-assisted analysis and automated trading, JENNA is more than a bot—she’s a digital entity designed to trade and provide market insight.

Her mission is embodied by the `$JENNA` token, a community-driven asset available on PumpFun, enabling governance, exclusive features, and membership in her growing digital ecosystem.

---

## 🌟 Features

### Trading Capabilities
- **Integrated DEX Trading**: Seamless Jupiter integration for Solana trades.
- **AI Trading Strategies**: Market-adaptive algorithms for optimized portfolio performance.
- **Risk Management**: Robust controls to mitigate trading losses.
- **Portfolio Insights**: Automated analysis for strategic adjustments.

### Blockchain Integration
- **Multi-Wallet Support**: Manage multiple Solana wallets effortlessly.
- **Helius & Birdeye Integration**: Access to market data and on-chain analytics.
- **Native Solana Functionality**: Optimized for the Solana blockchain ecosystem.

### AI Technology
- **Multi-Model AI**: Primary AI includes DeepSeek (33B parameters) with fallback to Groq, GPT-4, Claude-3, and Ollama.
- **Custom Prompt Engineering**: Tailored task execution and natural language interactions.
- **Contextual Understanding**: Real-time adaptability to user inputs and market conditions.

### Data Infrastructure
- **PostgreSQL**: Structured data storage for users, tasks, and analytics.
- **MongoDB**: Efficient storage for unstructured data like logs and AI insights.
- **Redis**: Real-time caching for performance optimization.
- **Distributed Transactions**: Scalable and secure data operations.

---

## 💎 $JENNA Token

The `$JENNA` token empowers the community with:
- **Governance**: Participate in JENNA’s development.
- **Exclusive Access**: Unlock premium features.
- **Membership**: Join the JENNA ecosystem.
- **Fee Benefits**: Reduced fees on trades and services.

---

## 🚀 Quick Start

### System Requirements

#### Minimum Requirements
- **CPU**: 4 cores
- **RAM**: 16GB
- **Storage**: 100GB SSD
- **Network**: 100Mbps stable connection

#### Software Prerequisites
- Node.js ≥18.0.0
- pnpm ≥8.0.0
- PostgreSQL ≥14.0
- MongoDB ≥6.0
- Redis ≥7.0
- Solana CLI tools

### Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/arhansuba/meme-agent.git
   cd meme-agent
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Database Setup**
   **PostgreSQL**:
   ```bash
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo -u postgres psql
   CREATE DATABASE meme_agent_db;
   CREATE USER meme_agent_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE meme_agent_db TO meme_agent_user;
   ```
   **Redis**:
   ```bash
   sudo apt install redis-server
   sudo systemctl start redis-server
   redis-cli ping
   ```

4. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   Configure required environment variables for Redis, PostgreSQL, and AI integrations:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=meme_agent_user
   POSTGRES_PASSWORD=your_password
   POSTGRES_DB=meme_agent_db
   ```

5. **Build and Start**
   ```bash
   pnpm build
   pnpm start --character=characters/jenna.character.json
   ```

---

## ⚙️ Advanced Configuration

### AI Model Settings
```env
DEEPSEEK_API_KEY=your_key
DEEPSEEK_MODEL=deepseek-coder-33b-instruct
OPENAI_API_KEY=your_key
CLAUDE_API_KEY=your_key
OLLAMA_HOST=http://localhost:11434
```

### Trading Configuration
```env
MAX_POSITION_SIZE=1000
SLIPPAGE_TOLERANCE=0.5
RISK_LEVEL=medium
TRADING_HOURS=24/7
```

---

## If you have any questions, contact to me.
Telegram <a href="https://t.me/Immutal0" target="_blank">@Immutal0</a>