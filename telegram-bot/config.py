import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

# Backend API Configuration  
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'http://localhost:3000')

# Logging Configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# Validate required environment variables
if not TELEGRAM_BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")

# Bot Configuration
BOT_CONFIG = {
    'token': TELEGRAM_BOT_TOKEN,
    'api_base_url': API_BASE_URL,
    'web_app_url': WEB_APP_URL,
    'log_level': LOG_LEVEL
}