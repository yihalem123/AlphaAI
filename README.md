# AI Trading Assistant

A comprehensive dual-platform AI-powered cryptocurrency trading assistant available as both a Telegram bot and modern web application.

## 🚀 Features

### 💬 Chat-based AI Trading Assistant
- **Natural Language Interface**: Ask questions like "What's the outlook for BTC this week?"
- **Market Sentiment Analysis**: Real-time insights from news and social media
- **Technical Analysis**: AI-powered interpretation of charts and indicators
- **Risk Assessment**: Smart position sizing and risk management advice
- **24/7 Availability**: Always-on AI assistant via Telegram and web

### 📊 Advanced Portfolio Management
- **Portfolio Tracking**: Monitor holdings across multiple wallets
- **Performance Analytics**: Detailed profit/loss tracking and insights
- **Diversification Analysis**: AI-powered portfolio optimization recommendations
- **Real-time Alerts**: Get notified of significant market movements

### 📈 Intelligent Trading Signals
- **AI-Generated Signals**: Buy/sell/hold recommendations with confidence scores
- **Technical Indicators**: MACD, RSI, Bollinger Bands, and more
- **Multi-timeframe Analysis**: 1h, 4h, 1d signal generation
- **Historical Performance**: Track signal accuracy over time

### 🌐 Dual Platform Access
- **Telegram Bot**: Full-featured bot with inline keyboards and Mini App
- **Web Application**: Modern, responsive interface with advanced features
- **Seamless Sync**: Account synchronization between platforms

## 🛠 Tech Stack

### Backend (FastAPI)
- **FastAPI** - High-performance async Python web framework
- **PostgreSQL** - Robust relational database with async support
- **SQLAlchemy** - Modern ORM with async capabilities
- **LangChain** - LLM integration and AI workflow orchestration
- **OpenAI API** - GPT models for natural language processing
- **CCXT** - Cryptocurrency exchange trading library
- **Celery + Redis** - Background task processing and caching
- **Alembic** - Database migration management

### Frontend (Next.js)
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn/ui** - Beautiful, accessible UI components
- **Next Themes** - Dark/light mode support
- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling and validation
- **Recharts** - Data visualization and charts
- **WalletConnect** - Multi-wallet crypto integration

### Telegram Bot
- **python-telegram-bot** - Modern async Telegram bot framework
- **Telegram Mini Apps** - Embedded web interface in Telegram
- **Inline Keyboards** - Rich interactive bot interface
- **TON Payments** - Telegram-native crypto payments

### Infrastructure
- **Docker** - Containerized deployment
- **Docker Compose** - Multi-service orchestration
- **Nginx** - Reverse proxy and load balancing
- **PostgreSQL** - Primary database
- **Redis** - Caching and message broker

## 📁 Project Structure

```
ai-trading-assistant/
├── backend/                 # FastAPI backend service
│   ├── api/                # API routes and endpoints
│   ├── core/               # Core business logic
│   ├── models/             # Database models
│   └── main.py             # Application entry point
├── frontend/               # Next.js web application
│   ├── app/                # Next.js App Router
│   ├── components/         # React components
│   ├── lib/                # Utility functions
│   └── types/              # TypeScript types
├── telegram-bot/           # Telegram bot service
│   ├── bot.py              # Main bot logic
│   └── config.py           # Bot configuration
├── deploy/                 # Deployment configurations
└── docker-compose.yml      # Development orchestration
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose (optional)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/ai-trading-assistant.git
cd ai-trading-assistant
```

### 2. Environment Setup

#### Backend Configuration
```bash
cd backend
cp config.example .env
# Edit .env with your API keys and database settings
pip install -r requirements.txt
```

#### Frontend Configuration
```bash
cd frontend
cp env.example .env.local
# Edit .env.local with your API URLs
npm install
```

#### Telegram Bot Configuration
```bash
cd telegram-bot
# Create .env file with TELEGRAM_BOT_TOKEN
pip install -r requirements.txt
```

### 3. Database Setup
```bash
# Start PostgreSQL and Redis
docker-compose up postgres redis -d

# Run database migrations
cd backend
alembic upgrade head
```

### 4. Start Services

#### Development Mode
```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Telegram Bot
cd telegram-bot
python bot.py
```

#### Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 5. Access the Application
- **Web App**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Telegram Bot**: @your_bot_username

## 🔧 Configuration

### Required Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost/ai_trading
SECRET_KEY=your-super-secret-jwt-key
OPENAI_API_KEY=your-openai-api-key
BINANCE_API_KEY=your-binance-api-key (optional)
BINANCE_SECRET_KEY=your-binance-secret-key (optional)
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

#### Telegram Bot (.env)
```env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
API_BASE_URL=http://localhost:8000
WEB_APP_URL=http://localhost:3000
```

## 💰 Monetization Model

### Subscription Tiers

#### 🆓 Free Tier
- 10 AI queries per day
- Basic market data access
- Signal viewing (limited)
- Portfolio tracking
- Community support

#### ⚡ Pro Tier ($10/month)
- 100 AI queries per day
- Advanced market analysis
- Signal generation
- Portfolio insights
- Market alerts
- Priority support

#### 👑 Premium Tier ($25/month)
- 1000 AI queries per day
- Priority AI responses
- Custom trading strategies
- Advanced portfolio analytics
- 24/7 priority support
- Early access to new features

### Payment Methods
- **Web App**: Multi-crypto payments (USDT, ETH, BTC, TON)
- **Telegram**: TON-based payments via Telegram Stars
- **Traditional**: Credit card payments (via Stripe)

## 🤖 AI Trading Features

### Market Analysis
- **Sentiment Analysis**: News and social media sentiment tracking
- **Technical Analysis**: 20+ technical indicators
- **Pattern Recognition**: Chart pattern identification
- **Volume Analysis**: Trading volume insights
- **Market Correlation**: Cross-asset correlation analysis

### Trading Signals
- **Multi-timeframe**: 1m, 5m, 15m, 1h, 4h, 1d signals
- **Confidence Scoring**: AI confidence levels (0-100%)
- **Entry/Exit Points**: Precise entry, target, and stop-loss levels
- **Risk/Reward Ratios**: Calculated risk-to-reward metrics
- **Historical Performance**: Backtested signal accuracy

### Portfolio Management
- **Multi-wallet Support**: Track multiple wallet addresses
- **Asset Allocation**: Diversification recommendations
- **Rebalancing Alerts**: Portfolio optimization suggestions
- **Performance Metrics**: ROI, Sharpe ratio, max drawdown
- **Tax Reporting**: Capital gains/losses tracking

## 🚀 Deployment

### Production Deployment

#### 1. Prepare Environment
```bash
# Copy production environment files
cp backend/config.example backend/.env.production
cp frontend/env.example frontend/.env.production
# Edit with production values
```

#### 2. Deploy with Docker
```bash
# Build and deploy
chmod +x deploy/deploy.sh
./deploy/deploy.sh production
```

#### 3. Set up Domain & SSL
```bash
# Configure nginx with SSL certificates
# Update DNS records to point to your server
```

### Cloud Deployment Options

#### Backend Deployment
- **Railway**: Easy Python deployment
- **Fly.io**: Global edge deployment
- **Google Cloud Run**: Serverless container deployment
- **AWS ECS**: Enterprise container orchestration

#### Frontend Deployment
- **Vercel**: Optimized Next.js deployment (recommended)
- **Netlify**: Static site deployment
- **AWS Amplify**: Full-stack deployment

#### Database Options
- **Supabase**: Managed PostgreSQL with real-time features
- **PlanetScale**: Serverless MySQL with branching
- **AWS RDS**: Managed relational database service

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/telegram` - Telegram authentication
- `POST /api/auth/wallet` - Crypto wallet authentication
- `GET /api/auth/me` - Get current user info

### AI Assistant Endpoints
- `POST /api/ai/chat` - Chat with AI assistant
- `GET /api/ai/market-overview` - Market overview data
- `GET /api/ai/price/{symbol}` - Get current price

### Trading Signals
- `GET /api/signals/` - List trading signals
- `POST /api/signals/generate` - Generate new signal
- `GET /api/signals/stats/performance` - Signal performance stats

### Portfolio Management
- `GET /api/portfolio/` - Get portfolio data
- `POST /api/portfolio/holdings` - Add/update holdings
- `GET /api/portfolio/analysis` - Portfolio analysis

### Subscription Management
- `GET /api/subscription/plans` - Available plans
- `POST /api/subscription/subscribe` - Create subscription
- `GET /api/subscription/current` - Current subscription

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test

# End-to-end tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.aitradingassistant.com](https://docs.aitradingassistant.com)
- **Discord Community**: [discord.gg/aitrading](https://discord.gg/aitrading)
- **Email Support**: support@aitradingassistant.com
- **Bug Reports**: [GitHub Issues](https://github.com/yourusername/ai-trading-assistant/issues)

## 🗺️ Roadmap

### Phase 1 (Current) - MVP
- ✅ AI chat interface
- ✅ Basic trading signals
- ✅ Portfolio tracking
- ✅ Telegram bot integration
- ✅ Subscription system

### Phase 2 - Advanced Features
- [ ] Advanced chart analysis
- [ ] Custom strategy builder
- [ ] Social trading features
- [ ] Mobile app (React Native)
- [ ] Advanced risk management tools

### Phase 3 - Enterprise
- [ ] White-label solutions
- [ ] Institutional features
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations
- [ ] Multi-language support

---

**Disclaimer**: This software is for educational and informational purposes only. Always do your own research and never invest more than you can afford to lose. Cryptocurrency trading carries significant risks.