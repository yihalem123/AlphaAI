import aiohttp
import asyncio
import ccxt.async_support as ccxt
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json
import os
from dotenv import load_dotenv

load_dotenv()

class MarketDataService:
    def __init__(self):
        self.coingecko_api = "https://api.coingecko.com/api/v3"
        self.binance_api = "https://api.binance.com/api/v3"
        self.session: Optional[aiohttp.ClientSession] = None
        self.exchanges = {}
        
    async def initialize(self):
        """Initialize aiohttp session and exchange connections"""
        self.session = aiohttp.ClientSession()
        
        # Initialize Binance exchange (for historical data)
        try:
            self.exchanges['binance'] = ccxt.binance({
                'apiKey': os.getenv('BINANCE_API_KEY', ''),
                'secret': os.getenv('BINANCE_SECRET_KEY', ''),
                'sandbox': os.getenv('BINANCE_SANDBOX', 'true').lower() == 'true',
                'enableRateLimit': True,
            })
        except Exception as e:
            print(f"Failed to initialize Binance: {e}")
            
    async def cleanup(self):
        """Clean up sessions and connections"""
        if self.session:
            await self.session.close()
        
        for exchange in self.exchanges.values():
            await exchange.close()

    async def get_current_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get current price data for a symbol"""
        try:
            # Try CoinGecko first
            coingecko_id = self._get_coingecko_id(symbol)
            if coingecko_id:
                url = f"{self.coingecko_api}/simple/price"
                params = {
                    'ids': coingecko_id,
                    'vs_currencies': 'usd',
                    'include_24hr_change': 'true',
                    'include_24hr_vol': 'true',
                    'include_market_cap': 'true'
                }
                
                async with self.session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        coin_data = data.get(coingecko_id, {})
                        
                        return {
                            'symbol': symbol,
                            'price': coin_data.get('usd', 0),
                            'change_24h': coin_data.get('usd_24h_change', 0),
                            'volume_24h': coin_data.get('usd_24h_vol', 0),
                            'market_cap': coin_data.get('usd_market_cap', 0),
                            'timestamp': datetime.utcnow().isoformat(),
                            'source': 'coingecko'
                        }
            
            # Fallback to Binance
            return await self._get_binance_price(symbol)
            
        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
            return None

    async def get_historical_data(self, symbol: str, timeframe: str = "1h", limit: int = 100) -> Optional[List[Dict]]:
        """Get historical OHLCV data"""
        try:
            if 'binance' in self.exchanges:
                exchange = self.exchanges['binance']
                
                # Convert symbol format for Binance (e.g., BTC -> BTC/USDT)
                binance_symbol = f"{symbol}/USDT"
                
                # Fetch OHLCV data
                ohlcv = await exchange.fetch_ohlcv(binance_symbol, timeframe, limit=limit)
                
                return [
                    {
                        'timestamp': candle[0],
                        'datetime': datetime.fromtimestamp(candle[0] / 1000).isoformat(),
                        'open': candle[1],
                        'high': candle[2],
                        'low': candle[3],
                        'close': candle[4],
                        'volume': candle[5]
                    }
                    for candle in ohlcv
                ]
            
            return None
            
        except Exception as e:
            print(f"Error fetching historical data for {symbol}: {e}")
            return None

    async def get_market_overview(self) -> Dict[str, Any]:
        """Get overall market overview"""
        try:
            url = f"{self.coingecko_api}/global"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    global_data = data.get('data', {})
                    
                    return {
                        'total_market_cap_usd': global_data.get('total_market_cap', {}).get('usd', 0),
                        'total_volume_24h_usd': global_data.get('total_volume', {}).get('usd', 0),
                        'bitcoin_dominance': global_data.get('market_cap_percentage', {}).get('btc', 0),
                        'ethereum_dominance': global_data.get('market_cap_percentage', {}).get('eth', 0),
                        'active_cryptocurrencies': global_data.get('active_cryptocurrencies', 0),
                        'markets': global_data.get('markets', 0),
                        'timestamp': datetime.utcnow().isoformat()
                    }
            
            return {}
            
        except Exception as e:
            print(f"Error fetching market overview: {e}")
            return {}

    async def get_trending_coins(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get trending/top coins by market cap"""
        try:
            url = f"{self.coingecko_api}/coins/markets"
            params = {
                'vs_currency': 'usd',
                'order': 'market_cap_desc',
                'per_page': limit,
                'page': 1,
                'sparkline': 'false',
                'price_change_percentage': '24h'
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    return [
                        {
                            'symbol': coin['symbol'].upper(),
                            'name': coin['name'],
                            'price': coin['current_price'],
                            'change_24h': coin['price_change_percentage_24h'],
                            'market_cap': coin['market_cap'],
                            'volume_24h': coin['total_volume'],
                            'market_cap_rank': coin['market_cap_rank']
                        }
                        for coin in data
                    ]
            
            return []
            
        except Exception as e:
            print(f"Error fetching trending coins: {e}")
            return []

    async def get_fear_greed_index(self) -> Optional[Dict[str, Any]]:
        """Get Fear & Greed Index (if available)"""
        try:
            # Alternative.me API for Fear & Greed Index
            url = "https://api.alternative.me/fng/"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    if 'data' in data and len(data['data']) > 0:
                        latest = data['data'][0]
                        return {
                            'value': int(latest['value']),
                            'classification': latest['value_classification'],
                            'timestamp': latest['timestamp'],
                            'date': datetime.fromtimestamp(int(latest['timestamp'])).isoformat()
                        }
            
            return None
            
        except Exception as e:
            print(f"Error fetching Fear & Greed Index: {e}")
            return None

    async def search_coins(self, query: str) -> List[Dict[str, Any]]:
        """Search for coins by name or symbol"""
        try:
            url = f"{self.coingecko_api}/search"
            params = {'query': query}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    coins = data.get('coins', [])
                    
                    return [
                        {
                            'id': coin['id'],
                            'name': coin['name'],
                            'symbol': coin['symbol'].upper(),
                            'market_cap_rank': coin.get('market_cap_rank'),
                            'thumb': coin.get('thumb', '')
                        }
                        for coin in coins[:10]  # Limit to top 10 results
                    ]
            
            return []
            
        except Exception as e:
            print(f"Error searching coins: {e}")
            return []

    async def get_portfolio_value(self, holdings: Dict[str, float]) -> Dict[str, Any]:
        """Calculate total portfolio value from holdings"""
        try:
            symbols = list(holdings.keys())
            total_value = 0
            asset_values = {}
            
            # Get current prices for all holdings
            for symbol in symbols:
                price_data = await self.get_current_price(symbol)
                if price_data:
                    amount = holdings[symbol]
                    value = price_data['price'] * amount
                    total_value += value
                    
                    asset_values[symbol] = {
                        'amount': amount,
                        'price': price_data['price'],
                        'value': value,
                        'change_24h': price_data['change_24h'],
                        'allocation_percentage': 0  # Will be calculated after total
                    }
            
            # Calculate allocation percentages
            for symbol in asset_values:
                if total_value > 0:
                    asset_values[symbol]['allocation_percentage'] = (asset_values[symbol]['value'] / total_value) * 100
            
            return {
                'total_value_usd': total_value,
                'assets': asset_values,
                'asset_count': len(asset_values),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error calculating portfolio value: {e}")
            return {'total_value_usd': 0, 'assets': {}, 'error': str(e)}

    async def _get_binance_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get price from Binance API as fallback"""
        try:
            binance_symbol = f"{symbol}USDT"
            url = f"{self.binance_api}/ticker/24hr"
            params = {'symbol': binance_symbol}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    return {
                        'symbol': symbol,
                        'price': float(data['lastPrice']),
                        'change_24h': float(data['priceChangePercent']),
                        'volume_24h': float(data['volume']),
                        'high_24h': float(data['highPrice']),
                        'low_24h': float(data['lowPrice']),
                        'timestamp': datetime.utcnow().isoformat(),
                        'source': 'binance'
                    }
            
            return None
            
        except Exception as e:
            print(f"Error fetching Binance price for {symbol}: {e}")
            return None

    def _get_coingecko_id(self, symbol: str) -> Optional[str]:
        """Map symbol to CoinGecko ID"""
        symbol_mapping = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'BNB': 'binancecoin',
            'ADA': 'cardano',
            'SOL': 'solana',
            'DOT': 'polkadot',
            'MATIC': 'matic-network',
            'AVAX': 'avalanche-2',
            'LINK': 'chainlink',
            'UNI': 'uniswap',
            'LTC': 'litecoin',
            'BCH': 'bitcoin-cash',
            'XRP': 'ripple',
            'ATOM': 'cosmos',
            'ALGO': 'algorand',
            'VET': 'vechain',
            'ICP': 'internet-computer',
            'FIL': 'filecoin',
            'TRX': 'tron',
            'ETC': 'ethereum-classic'
        }
        
        return symbol_mapping.get(symbol.upper())

    async def get_exchange_rates(self) -> Dict[str, float]:
        """Get major fiat currency exchange rates"""
        try:
            url = "https://api.exchangerate-api.com/v4/latest/USD"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get('rates', {})
            
            return {}
            
        except Exception as e:
            print(f"Error fetching exchange rates: {e}")
            return {}