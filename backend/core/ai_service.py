import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import aiohttp
import pandas as pd
import numpy as np
from langchain.llms import OpenAI
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain.schema import BaseMessage, HumanMessage, AIMessage
import ta
from .market_data import MarketDataService

class AITradingService:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.model = OpenAI(
            api_key=self.openai_api_key,
            temperature=0.3,
            max_tokens=1000
        )
        self.market_service = MarketDataService()
        self.trading_prompt = self._create_trading_prompt()
        
    def _create_trading_prompt(self) -> PromptTemplate:
        template = """You are an expert AI trading assistant specializing in cryptocurrency markets. 
        Your role is to help traders make informed decisions based on market analysis, technical indicators, and risk assessment.

        Current Market Context:
        {market_context}

        Technical Analysis:
        {technical_analysis}

        Recent News & Sentiment:
        {news_sentiment}

        User Query: {user_input}

        Guidelines:
        1. Always provide clear, actionable insights
        2. Include risk warnings for high-risk trades
        3. Explain your reasoning using technical and fundamental analysis
        4. Suggest position sizing and risk management
        5. Be honest about market uncertainty
        6. provide financial advice - only educational analysis
        7. Include current market data and price information when relevant
        8. Reference TradingView charts when discussing technical analysis

        Response:"""
        
        return PromptTemplate(
            input_variables=["market_context", "technical_analysis", "news_sentiment", "user_input"],
            template=template
        )

    async def analyze_market_sentiment(self, symbol: str) -> Dict[str, Any]:
        """Analyze market sentiment for a given symbol"""
        try:
            # Get recent news and social sentiment
            news_data = await self._fetch_news_sentiment(symbol)
            social_sentiment = await self._analyze_social_sentiment(symbol)
            
            # Combine sentiments
            overall_sentiment = self._calculate_overall_sentiment(news_data, social_sentiment)
            
            return {
                "symbol": symbol,
                "sentiment_score": overall_sentiment["score"],
                "sentiment_label": overall_sentiment["label"],
                "news_sentiment": news_data,
                "social_sentiment": social_sentiment,
                "confidence": overall_sentiment["confidence"]
            }
        except Exception as e:
            return {
                "symbol": symbol,
                "sentiment_score": 0.0,
                "sentiment_label": "neutral",
                "error": str(e)
            }

    async def generate_trading_signal(self, symbol: str, timeframe: str = "1h") -> Dict[str, Any]:
        """Generate trading signal based on technical analysis and AI assessment"""
        try:
            # Get market data
            market_data = await self.market_service.get_historical_data(symbol, timeframe, 100)
            
            if not market_data:
                raise ValueError(f"No market data available for {symbol}")

            # Calculate technical indicators
            technical_analysis = self._calculate_technical_indicators(market_data)
            
            # Get sentiment analysis
            sentiment = await self.analyze_market_sentiment(symbol)
            
            # Generate AI-based signal
            signal = await self._generate_ai_signal(symbol, technical_analysis, sentiment)
            
            return signal
            
        except Exception as e:
            return {
                "symbol": symbol,
                "signal": "neutral",
                "confidence": 0.0,
                "error": str(e)
            }

    async def chat_response(self, user_input: str, user_context: Dict[str, Any] = None) -> str:
        """Generate AI chat response with market data integration"""
        try:
            # Extract symbol from user input
            symbol = self._extract_symbol_from_input(user_input)
            
            # Get current market data
            market_context = ""
            technical_analysis = ""
            news_sentiment = ""
            
            if symbol:
                # Get current price and market data
                current_price = await self.market_service.get_current_price(symbol)
                if current_price:
                    market_context = f"""
Current {symbol} Market Data:
- Price: ${current_price['price']:,.2f}
- 24h Change: {current_price['change_24h']:+.2f}%
- 24h Volume: ${current_price['volume_24h']:,.0f}
- Market Cap: ${current_price['market_cap']:,.0f}
- Last Updated: {current_price['timestamp']}
"""
                
                # Get technical analysis
                historical_data = await self.market_service.get_historical_data(symbol, "1h", 100)
                if historical_data:
                    technical_analysis = self._format_technical_analysis(
                        self._calculate_technical_indicators(historical_data)
                    )
                
                # Get sentiment analysis
                sentiment = await self.analyze_market_sentiment(symbol)
                if sentiment:
                    news_sentiment = f"""
Market Sentiment for {symbol}:
- Overall Sentiment: {sentiment['sentiment_label']}
- Sentiment Score: {sentiment['sentiment_score']:.2f}
- Confidence: {sentiment['confidence']:.2f}
"""
            
            # Generate AI response
            response = await self._generate_ai_response(
                user_input, market_context, technical_analysis, news_sentiment
            )
            
            # Add TradingView chart link if symbol is mentioned
            if symbol:
                chart_link = f"\n\n📊 **TradingView Chart**: [View {symbol}/USD Chart](https://www.tradingview.com/symbols/{symbol}USD/)"
                response += chart_link
            
            return response
            
        except Exception as e:
            return f"I apologize, but I encountered an error while processing your request: {str(e)}. Please try again."

    async def _generate_ai_response(self, user_input: str, market_context: str, technical_analysis: str, news_sentiment: str) -> str:
        """Generate AI response using the trading prompt"""
        try:
            # Create the prompt with current market data
            prompt = self.trading_prompt.format(
                market_context=market_context or "No current market data available",
                technical_analysis=technical_analysis or "No technical analysis available",
                news_sentiment=news_sentiment or "No sentiment data available",
                user_input=user_input
            )
            
            # Generate response using OpenAI
            if self.openai_api_key:
                response = self.model(prompt)
                return response
            else:
                # Fallback response without OpenAI
                return self._generate_fallback_response(user_input, market_context, technical_analysis)
                
        except Exception as e:
            return self._generate_fallback_response(user_input, market_context, technical_analysis)

    def _generate_fallback_response(self, user_input: str, market_context: str, technical_analysis: str) -> str:
        """Generate a fallback response when OpenAI is not available"""
        user_input_lower = user_input.lower()
        
        if "price" in user_input_lower or "value" in user_input_lower:
            if market_context:
                return f"Based on current market data:\n{market_context}\n\nFor real-time charts and analysis, I recommend checking TradingView."
            else:
                return "I'm unable to fetch current price data at the moment. Please check TradingView or CoinGecko for real-time prices."
        
        elif "signal" in user_input_lower or "trade" in user_input_lower:
            if technical_analysis:
                return f"Technical Analysis:\n{technical_analysis}\n\nRemember to always do your own research and consider risk management before trading."
            else:
                return "I'm unable to generate trading signals at the moment. Please check TradingView for technical analysis and chart patterns."
        
        elif "analysis" in user_input_lower or "outlook" in user_input_lower:
            return f"Market Analysis:\n{market_context}\n{technical_analysis}\n\nFor comprehensive analysis, I recommend using TradingView charts and multiple timeframes."
        
        else:
            return "I'm here to help with your trading questions! I can provide market analysis, technical insights, and trading education. What specific information are you looking for?"

    def _calculate_technical_indicators(self, data: List[Dict]) -> Dict[str, Any]:
        """Calculate technical indicators from historical data"""
        try:
            if not data or len(data) < 20:
                return {}
            
            # Convert to DataFrame
            df = pd.DataFrame(data)
            df['close'] = pd.to_numeric(df['close'])
            df['high'] = pd.to_numeric(df['high'])
            df['low'] = pd.to_numeric(df['low'])
            df['volume'] = pd.to_numeric(df['volume'])
            
            # Calculate indicators
            indicators = {}
            
            # RSI
            if len(df) >= 14:
                indicators['rsi'] = ta.momentum.RSIIndicator(df['close']).rsi().iloc[-1]
            
            # MACD
            if len(df) >= 26:
                macd = ta.trend.MACD(df['close'])
                indicators['macd'] = macd.macd().iloc[-1]
                indicators['macd_signal'] = macd.macd_signal().iloc[-1]
            
            # Bollinger Bands
            if len(df) >= 20:
                bb = ta.volatility.BollingerBands(df['close'])
                indicators['bb_upper'] = bb.bollinger_hband().iloc[-1]
                indicators['bb_lower'] = bb.bollinger_lband().iloc[-1]
                indicators['bb_middle'] = bb.bollinger_mavg().iloc[-1]
            
            # Moving Averages
            indicators['sma_20'] = ta.trend.SMAIndicator(df['close'], window=20).sma_indicator().iloc[-1]
            indicators['sma_50'] = ta.trend.SMAIndicator(df['close'], window=50).sma_indicator().iloc[-1]
            
            # Volume
            indicators['volume_avg'] = df['volume'].rolling(window=20).mean().iloc[-1]
            indicators['current_volume'] = df['volume'].iloc[-1]
            
            return indicators
            
        except Exception as e:
            return {"error": str(e)}

    async def _generate_ai_signal(self, symbol: str, technical_analysis: Dict, sentiment: Dict) -> Dict[str, Any]:
        """Generate AI-based trading signal"""
        try:
            # Analyze technical indicators
            signal_strength = 0
            signal_direction = "neutral"
            
            if technical_analysis:
                # RSI analysis
                rsi = technical_analysis.get('rsi', 50)
                if rsi < 30:
                    signal_strength += 1
                    signal_direction = "buy"
                elif rsi > 70:
                    signal_strength += 1
                    signal_direction = "sell"
                
                # MACD analysis
                macd = technical_analysis.get('macd', 0)
                macd_signal = technical_analysis.get('macd_signal', 0)
                if macd > macd_signal:
                    signal_strength += 1
                    if signal_direction == "neutral":
                        signal_direction = "buy"
                elif macd < macd_signal:
                    signal_strength += 1
                    if signal_direction == "neutral":
                        signal_direction = "sell"
                
                # Moving average analysis
                sma_20 = technical_analysis.get('sma_20', 0)
                sma_50 = technical_analysis.get('sma_50', 0)
                current_price = technical_analysis.get('close', 0)
                
                if current_price > sma_20 > sma_50:
                    signal_strength += 1
                    if signal_direction == "neutral":
                        signal_direction = "buy"
                elif current_price < sma_20 < sma_50:
                    signal_strength += 1
                    if signal_direction == "neutral":
                        signal_direction = "sell"
            
            # Sentiment analysis
            sentiment_score = sentiment.get('sentiment_score', 0)
            if sentiment_score > 0.3:
                signal_strength += 1
                if signal_direction == "neutral":
                    signal_direction = "buy"
            elif sentiment_score < -0.3:
                signal_strength += 1
                if signal_direction == "neutral":
                    signal_direction = "sell"
            
            # Calculate confidence
            confidence = min(signal_strength / 4.0, 1.0)
            
            return {
                "symbol": symbol,
                "signal": signal_direction,
                "confidence": confidence,
                "technical_analysis": technical_analysis,
                "sentiment": sentiment,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "symbol": symbol,
                "signal": "neutral",
                "confidence": 0.0,
                "error": str(e)
            }

    def _extract_symbol_from_input(self, user_input: str) -> Optional[str]:
        """Extract cryptocurrency symbol from user input"""
        # Common cryptocurrency symbols
        symbols = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'UNI', 'AVAX', 'MATIC', 'ATOM']
        
        user_input_upper = user_input.upper()
        for symbol in symbols:
            if symbol in user_input_upper:
                return symbol
        
        return None

    def _format_technical_analysis(self, indicators: Dict) -> str:
        """Format technical analysis for display"""
        if not indicators or 'error' in indicators:
            return "Technical analysis not available"
        
        analysis = []
        
        if 'rsi' in indicators:
            rsi = indicators['rsi']
            if rsi < 30:
                analysis.append(f"RSI: {rsi:.1f} (Oversold)")
            elif rsi > 70:
                analysis.append(f"RSI: {rsi:.1f} (Overbought)")
            else:
                analysis.append(f"RSI: {rsi:.1f} (Neutral)")
        
        if 'macd' in indicators and 'macd_signal' in indicators:
            macd = indicators['macd']
            macd_signal = indicators['macd_signal']
            if macd > macd_signal:
                analysis.append(f"MACD: Bullish (MACD > Signal)")
            else:
                analysis.append(f"MACD: Bearish (MACD < Signal)")
        
        if 'sma_20' in indicators and 'sma_50' in indicators:
            sma_20 = indicators['sma_20']
            sma_50 = indicators['sma_50']
            if sma_20 > sma_50:
                analysis.append("Moving Averages: Bullish (SMA20 > SMA50)")
            else:
                analysis.append("Moving Averages: Bearish (SMA20 < SMA50)")
        
        return "\n".join(analysis) if analysis else "No technical indicators available"

    async def _fetch_news_sentiment(self, symbol: str) -> Dict[str, Any]:
        """Fetch news sentiment for a symbol (placeholder)"""
        return {
            "sentiment": "neutral",
            "score": 0.0,
            "articles_count": 0
        }

    async def _analyze_social_sentiment(self, symbol: str) -> Dict[str, Any]:
        """Analyze social media sentiment (placeholder)"""
        return {
            "sentiment": "neutral",
            "score": 0.0,
            "mentions": 0
        }

    def _calculate_overall_sentiment(self, news_data: Dict, social_data: Dict) -> Dict[str, Any]:
        """Calculate overall sentiment score"""
        news_score = news_data.get('score', 0.0)
        social_score = social_data.get('score', 0.0)
        
        overall_score = (news_score + social_score) / 2
        
        if overall_score > 0.3:
            label = "bullish"
        elif overall_score < -0.3:
            label = "bearish"
        else:
            label = "neutral"
        
        return {
            "score": overall_score,
            "label": label,
            "confidence": 0.7
        }