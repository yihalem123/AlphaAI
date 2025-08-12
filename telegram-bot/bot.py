import os
import logging
import asyncio
import aiohttp
from datetime import datetime
from typing import Optional, Dict, Any

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import (
    Application, 
    CommandHandler, 
    MessageHandler, 
    CallbackQueryHandler,
    ContextTypes,
    filters
)
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Configuration
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'http://localhost:3000')

class AITradingBot:
    def __init__(self):
        self.application = Application.builder().token(BOT_TOKEN).build()
        self.session: Optional[aiohttp.ClientSession] = None
        self.user_sessions: Dict[int, Dict[str, Any]] = {}
        
    async def initialize(self):
        """Initialize the bot and HTTP session"""
        self.session = aiohttp.ClientSession()
        logger.info("Bot initialized successfully")

    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()

    async def api_request(self, method: str, endpoint: str, data: Optional[Dict] = None, user_token: Optional[str] = None) -> Optional[Dict]:
        """Make API request to backend"""
        try:
            headers = {'Content-Type': 'application/json'}
            if user_token:
                headers['Authorization'] = f'Bearer {user_token}'
            
            url = f"{API_BASE_URL}{endpoint}"
            
            if method.upper() == 'GET':
                async with self.session.get(url, headers=headers) as response:
                    if response.status == 200:
                        return await response.json()
            elif method.upper() == 'POST':
                async with self.session.post(url, json=data, headers=headers) as response:
                    if response.status == 200:
                        return await response.json()
            
            return None
        except Exception as e:
            logger.error(f"API request failed: {e}")
            return None

    async def authenticate_user(self, user_id: int, user_data: Dict) -> Optional[str]:
        """Authenticate user with backend and return token"""
        auth_data = {
            "id": user_id,
            "first_name": user_data.get('first_name', ''),
            "last_name": user_data.get('last_name', ''),
            "username": user_data.get('username', ''),
            "auth_date": int(datetime.now().timestamp()),
            "hash": f"demo_hash_{user_id}"  # In production, use proper Telegram auth
        }
        
        response = await self.api_request('POST', '/api/auth/telegram', auth_data)
        
        if response:
            token = response.get('access_token')
            if token:
                # Store user session
                self.user_sessions[user_id] = {
                    'token': token,
                    'user_data': response.get('user', {}),
                    'authenticated_at': datetime.now()
                }
                return token
        
        return None

    def get_user_token(self, user_id: int) -> Optional[str]:
        """Get user token from session"""
        session = self.user_sessions.get(user_id)
        return session.get('token') if session else None

    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        user = update.effective_user
        user_id = user.id
        
        # Authenticate user
        user_data = {
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username
        }
        
        token = await self.authenticate_user(user_id, user_data)
        
        if not token:
            await update.message.reply_text(
                "❌ Authentication failed. Please try again later."
            )
            return

        # Create welcome message with inline keyboard
        keyboard = [
            [
                InlineKeyboardButton("💬 Chat with AI", callback_data="chat_ai"),
                InlineKeyboardButton("📊 Portfolio", callback_data="portfolio")
            ],
            [
                InlineKeyboardButton("📈 Signals", callback_data="signals"),
                InlineKeyboardButton("🌐 Market", callback_data="market")
            ],
            [
                InlineKeyboardButton("🚀 Open Web App", web_app=WebAppInfo(url=WEB_APP_URL))
            ],
            [
                InlineKeyboardButton("💎 Subscribe", callback_data="subscribe"),
                InlineKeyboardButton("❓ Help", callback_data="help")
            ]
        ]
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        welcome_text = f"""
🤖 **Welcome to AI Trading Assistant!**

Hello {user.first_name}! 👋

I'm your personal AI-powered cryptocurrency trading assistant. I can help you with:

🔸 **Market Analysis** - Real-time insights and sentiment
🔸 **Trading Signals** - AI-generated buy/sell recommendations  
🔸 **Portfolio Tracking** - Monitor your holdings and performance
🔸 **Risk Assessment** - Smart position sizing and risk management
🔸 **24/7 Chat Support** - Ask me anything about crypto trading

**Quick Actions:**
• Use the buttons below for quick access
• Type your questions directly to chat with AI
• Open the web app for the full experience

Ready to start trading smarter? 🚀
        """
        
        await update.message.reply_text(
            welcome_text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )

    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        help_text = """
🆘 **AI Trading Assistant - Help**

**Available Commands:**
• `/start` - Welcome message and main menu
• `/portfolio` - View your portfolio summary
• `/signal <SYMBOL>` - Generate trading signal (e.g., /signal BTC)
• `/price <SYMBOL>` - Get current price (e.g., /price ETH)
• `/subscribe` - View subscription plans
• `/help` - Show this help message

**Chat Features:**
• Simply type your questions to chat with AI
• Ask about market analysis, trading strategies, risk management
• Get personalized recommendations based on your profile

**Examples:**
• "What's the outlook for Bitcoin this week?"
• "Should I buy ETH now?"
• "Analyze my portfolio risk"
• "What are the top altcoins to watch?"

**Web App:**
• Use the "Open Web App" button for full features
• Sync your account between Telegram and web
• Access advanced portfolio tools and analytics

**Subscription Tiers:**
• 🆓 **Free**: 10 AI queries/day, basic features
• ⚡ **Pro**: 100 queries/day, advanced analysis
• 👑 **Premium**: 1000 queries/day, priority support

Need more help? Contact support: @support
        """
        
        await update.message.reply_text(help_text, parse_mode='Markdown')

    async def portfolio_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /portfolio command"""
        user_id = update.effective_user.id
        token = self.get_user_token(user_id)
        
        if not token:
            await update.message.reply_text("Please use /start to authenticate first.")
            return

        # Fetch portfolio data
        portfolio_data = await self.api_request('GET', '/api/portfolio/', user_token=token)
        
        if not portfolio_data:
            await update.message.reply_text("❌ Unable to fetch portfolio data.")
            return

        if portfolio_data.get('asset_count', 0) == 0:
            keyboard = [[InlineKeyboardButton("🚀 Open Web App to Add Holdings", web_app=WebAppInfo(url=WEB_APP_URL))]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                "📊 **Your Portfolio is Empty**\n\nAdd your cryptocurrency holdings using the web app to start tracking your portfolio.",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            return

        # Format portfolio message
        total_value = portfolio_data.get('total_value_usd', 0)
        change_24h = portfolio_data.get('total_change_24h', 0)
        change_pct = portfolio_data.get('total_change_percentage_24h', 0)
        
        change_emoji = "🟢" if change_24h >= 0 else "🔴"
        change_sign = "+" if change_24h >= 0 else ""
        
        portfolio_text = f"""
📊 **Your Portfolio Summary**

💰 **Total Value:** ${total_value:,.2f}
{change_emoji} **24h Change:** {change_sign}${change_24h:,.2f} ({change_sign}{change_pct:.2f}%)

**Top Holdings:**
"""
        
        # Add top 5 assets
        assets = portfolio_data.get('assets', {})
        sorted_assets = sorted(assets.items(), key=lambda x: x[1].get('value', 0), reverse=True)
        
        for i, (symbol, asset_data) in enumerate(sorted_assets[:5]):
            value = asset_data.get('value', 0)
            allocation = asset_data.get('allocation_percentage', 0)
            change = asset_data.get('change_24h', 0)
            change_emoji = "🟢" if change >= 0 else "🔴"
            
            portfolio_text += f"\n{i+1}. **{symbol}**: ${value:,.2f} ({allocation:.1f}%) {change_emoji}"
        
        keyboard = [
            [InlineKeyboardButton("🔄 Refresh", callback_data="portfolio")],
            [InlineKeyboardButton("🚀 Open Web App", web_app=WebAppInfo(url=WEB_APP_URL))]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            portfolio_text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )

    async def signal_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /signal command"""
        user_id = update.effective_user.id
        token = self.get_user_token(user_id)
        
        if not token:
            await update.message.reply_text("Please use /start to authenticate first.")
            return

        # Get symbol from command args
        symbol = 'BTC'  # Default
        if context.args:
            symbol = context.args[0].upper()

        await update.message.reply_text(f"🔄 Generating trading signal for {symbol}...")

        # Generate signal
        signal_data = await self.api_request(
            'POST', 
            '/api/signals/generate', 
            {'symbol': symbol, 'timeframe': '1h'},
            user_token=token
        )
        
        if not signal_data:
            await update.message.reply_text("❌ Unable to generate signal. Please try again.")
            return

        # Format signal message
        signal_type = signal_data.get('signal_type', 'hold').upper()
        confidence = signal_data.get('confidence', 0) * 100
        entry_price = signal_data.get('price', 0)
        target_price = signal_data.get('target_price')
        stop_loss = signal_data.get('stop_loss')
        reasoning = signal_data.get('reasoning', '')
        
        signal_emoji = {
            'BUY': '🟢',
            'SELL': '🔴', 
            'HOLD': '🟡'
        }.get(signal_type, '🟡')
        
        signal_text = f"""
📈 **Trading Signal: {symbol}**

{signal_emoji} **Action:** {signal_type}
🎯 **Confidence:** {confidence:.1f}%
💰 **Entry Price:** ${entry_price:,.2f}
"""
        
        if target_price:
            signal_text += f"🎯 **Target:** ${target_price:,.2f}\n"
        
        if stop_loss:
            signal_text += f"🛡️ **Stop Loss:** ${stop_loss:,.2f}\n"
        
        signal_text += f"\n📋 **Analysis:**\n{reasoning}"
        
        keyboard = [
            [InlineKeyboardButton("🔄 New Signal", callback_data=f"signal_{symbol}")],
            [InlineKeyboardButton("📊 View All Signals", callback_data="signals")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            signal_text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )

    async def price_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /price command"""
        user_id = update.effective_user.id
        token = self.get_user_token(user_id)
        
        if not token:
            await update.message.reply_text("Please use /start to authenticate first.")
            return

        # Get symbol from command args
        symbol = 'BTC'  # Default
        if context.args:
            symbol = context.args[0].upper()

        # Fetch price data
        price_data = await self.api_request('GET', f'/api/ai/price/{symbol}', user_token=token)
        
        if not price_data:
            await update.message.reply_text(f"❌ Unable to fetch price for {symbol}.")
            return

        price = price_data.get('price', 0)
        change_24h = price_data.get('change_24h', 0)
        change_emoji = "🟢" if change_24h >= 0 else "🔴"
        change_sign = "+" if change_24h >= 0 else ""
        
        price_text = f"""
💰 **{symbol} Price**

**Current Price:** ${price:,.2f}
{change_emoji} **24h Change:** {change_sign}{change_24h:.2f}%

*Data from {price_data.get('source', 'API')}*
        """
        
        keyboard = [
            [InlineKeyboardButton("🔄 Refresh", callback_data=f"price_{symbol}")],
            [InlineKeyboardButton("📈 Generate Signal", callback_data=f"signal_{symbol}")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            price_text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )

    async def subscribe_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /subscribe command"""
        subscribe_text = """
💎 **Subscription Plans**

🆓 **Free Plan**
• 10 AI queries per day
• Basic market data
• Signal viewing
• Portfolio tracking

⚡ **Pro Plan - $10/month**
• 100 AI queries per day
• Advanced market analysis
• Signal generation
• Market alerts
• Priority support

👑 **Premium Plan - $25/month**
• 1000 AI queries per day
• Priority AI responses
• Custom trading strategies
• Advanced portfolio analytics
• 24/7 priority support
• Early feature access

**Payment Methods:**
💳 Crypto payments (USDT, ETH, TON, BTC)
🔗 Telegram Payments (Stars)
        """
        
        keyboard = [
            [InlineKeyboardButton("🚀 Upgrade via Web App", web_app=WebAppInfo(url=f"{WEB_APP_URL}?tab=subscription"))],
            [InlineKeyboardButton("💳 Pay with TON", callback_data="pay_ton")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            subscribe_text,
            reply_markup=reply_markup,
            parse_mode='Markdown'
        )

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle regular text messages (AI chat)"""
        user_id = update.effective_user.id
        token = self.get_user_token(user_id)
        
        if not token:
            await update.message.reply_text("Please use /start to authenticate first.")
            return

        user_message = update.message.text
        
        # Send typing indicator
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
        
        # Send message to AI
        chat_response = await self.api_request(
            'POST',
            '/api/ai/chat',
            {'message': user_message, 'platform': 'telegram'},
            user_token=token
        )
        
        if not chat_response:
            await update.message.reply_text("❌ Sorry, I'm having trouble processing your request. Please try again.")
            return

        ai_response = chat_response.get('response', 'No response available.')
        
        # Add quick action buttons
        keyboard = [
            [
                InlineKeyboardButton("📈 Generate Signal", callback_data="quick_signal"),
                InlineKeyboardButton("📊 View Portfolio", callback_data="portfolio")
            ],
            [InlineKeyboardButton("🚀 Open Web App", web_app=WebAppInfo(url=WEB_APP_URL))]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            ai_response,
            reply_markup=reply_markup
        )

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle inline keyboard callbacks"""
        query = update.callback_query
        await query.answer()
        
        callback_data = query.data
        
        if callback_data == "chat_ai":
            await query.message.reply_text("💬 Just type your question and I'll help you with trading insights!")
        
        elif callback_data == "portfolio":
            # Simulate portfolio command
            update.effective_user = query.from_user
            await self.portfolio_command(update, context)
        
        elif callback_data == "signals":
            await query.message.reply_text("📈 Recent signals will be shown here. Use /signal <SYMBOL> to generate new ones!")
        
        elif callback_data == "market":
            await query.message.reply_text("🌐 Market overview feature coming soon! Use the web app for detailed market data.")
        
        elif callback_data == "subscribe":
            await self.subscribe_command(update, context)
        
        elif callback_data == "help":
            await self.help_command(update, context)
        
        elif callback_data.startswith("signal_"):
            symbol = callback_data.split("_")[1] if "_" in callback_data else "BTC"
            context.args = [symbol]
            await self.signal_command(update, context)
        
        elif callback_data.startswith("price_"):
            symbol = callback_data.split("_")[1] if "_" in callback_data else "BTC"
            context.args = [symbol]
            await self.price_command(update, context)
        
        elif callback_data == "quick_signal":
            context.args = ["BTC"]
            await self.signal_command(update, context)

    def setup_handlers(self):
        """Setup command and message handlers"""
        # Command handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("portfolio", self.portfolio_command))
        self.application.add_handler(CommandHandler("signal", self.signal_command))
        self.application.add_handler(CommandHandler("price", self.price_command))
        self.application.add_handler(CommandHandler("subscribe", self.subscribe_command))
        
        # Callback handler
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
        
        # Message handler for AI chat
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))

    async def run(self):
        """Run the bot"""
        await self.initialize()
        self.setup_handlers()
        
        logger.info("Starting AI Trading Bot...")
        await self.application.run_polling()

# Main execution
async def main():
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not found in environment variables")
        return
    
    bot = AITradingBot()
    try:
        await bot.run()
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    finally:
        await bot.cleanup()

if __name__ == '__main__':
    asyncio.run(main())