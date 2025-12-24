"""
Trading Environment for RL Training

A Gymnasium-compatible environment for cryptocurrency trading.
State: OHLCV + Technical Indicators
Actions: 0=HOLD, 1=LONG, 2=SHORT
Reward: PnL with risk penalties
"""

import numpy as np
import gymnasium as gym
from gymnasium import spaces
from typing import Optional, Tuple, Dict, Any
import pandas as pd


class TradingEnv(gym.Env):
    """
    Custom Trading Environment for Reinforcement Learning.
    
    Features:
    - OHLCV price data
    - Technical indicators (RSI, MACD, BB)
    - Position management (long/short/flat)
    - Realistic transaction costs
    """
    
    metadata = {'render_modes': ['human']}
    
    def __init__(
        self,
        data: pd.DataFrame,
        initial_balance: float = 10000.0,
        transaction_cost: float = 0.001,  # 0.1% per trade
        max_position_size: float = 1.0,
        lookback_window: int = 20,
    ):
        super().__init__()
        
        self.data = data.reset_index(drop=True)
        self.initial_balance = initial_balance
        self.transaction_cost = transaction_cost
        self.max_position_size = max_position_size
        self.lookback_window = lookback_window
        
        # Ensure we have required columns
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        for col in required_cols:
            if col not in self.data.columns:
                raise ValueError(f"Data must contain column: {col}")
        
        # Add technical indicators if not present
        self._add_indicators()
        
        # Define action space: 0=HOLD, 1=LONG, 2=SHORT
        self.action_space = spaces.Discrete(3)
        
        # Define observation space (normalized features)
        # Features: price_change, rsi, macd, bb_position, volume_ratio, position, pnl
        n_features = 10
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(n_features,), dtype=np.float32
        )
        
        # State variables
        self.current_step = 0
        self.balance = initial_balance
        self.position = 0  # -1=short, 0=flat, 1=long
        self.entry_price = 0.0
        self.total_pnl = 0.0
        self.trades = []
        
    def _add_indicators(self):
        """Add technical indicators to data."""
        df = self.data
        
        # RSI
        if 'rsi' not in df.columns:
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / (loss + 1e-10)
            df['rsi'] = 100 - (100 / (1 + rs))
        
        # MACD
        if 'macd' not in df.columns:
            ema12 = df['close'].ewm(span=12).mean()
            ema26 = df['close'].ewm(span=26).mean()
            df['macd'] = ema12 - ema26
            df['macd_signal'] = df['macd'].ewm(span=9).mean()
        
        # Bollinger Bands position
        if 'bb_position' not in df.columns:
            sma20 = df['close'].rolling(20).mean()
            std20 = df['close'].rolling(20).std()
            df['bb_upper'] = sma20 + 2 * std20
            df['bb_lower'] = sma20 - 2 * std20
            df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'] + 1e-10)
        
        # Volume ratio
        if 'volume_ratio' not in df.columns:
            avg_vol = df['volume'].rolling(20).mean()
            df['volume_ratio'] = df['volume'] / (avg_vol + 1e-10)
        
        # Price change
        df['price_change'] = df['close'].pct_change()
        
        # Fill NaN with 0
        df.fillna(0, inplace=True)
        self.data = df
        
    def _get_observation(self) -> np.ndarray:
        """Get current observation."""
        row = self.data.iloc[self.current_step]
        
        # Normalize features
        obs = np.array([
            row['price_change'] * 100,  # Scale to ~[-10, 10]
            (row['rsi'] - 50) / 50,     # Scale to [-1, 1]
            row['macd'] / (row['close'] * 0.01 + 1e-10),  # Normalized MACD
            row['bb_position'] * 2 - 1,  # Scale to [-1, 1]
            min(row['volume_ratio'], 3) - 1,  # Cap at 3x, scale to [-1, 2]
            self.position,  # -1, 0, 1
            self.total_pnl / self.initial_balance,  # Normalized PnL
            (row['high'] - row['low']) / row['close'],  # Volatility
            row.get('macd_signal', 0) / (row['close'] * 0.01 + 1e-10),
            (self.current_step / len(self.data)) * 2 - 1,  # Time position
        ], dtype=np.float32)
        
        return obs
    
    def reset(
        self, 
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, Dict]:
        """Reset environment."""
        super().reset(seed=seed)
        
        self.current_step = self.lookback_window
        self.balance = self.initial_balance
        self.position = 0
        self.entry_price = 0.0
        self.total_pnl = 0.0
        self.trades = []
        
        return self._get_observation(), {}
    
    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        """Execute one step."""
        current_price = self.data.iloc[self.current_step]['close']
        prev_price = self.data.iloc[self.current_step - 1]['close']
        
        reward = 0.0
        
        # Handle position changes
        if action == 1:  # LONG
            if self.position == -1:  # Close short first
                pnl = (self.entry_price - current_price) * self.max_position_size
                self.total_pnl += pnl - (current_price * self.transaction_cost)
                self.trades.append({'type': 'close_short', 'price': current_price, 'pnl': pnl})
            if self.position != 1:  # Open long
                self.position = 1
                self.entry_price = current_price
                self.balance -= current_price * self.transaction_cost
                
        elif action == 2:  # SHORT
            if self.position == 1:  # Close long first
                pnl = (current_price - self.entry_price) * self.max_position_size
                self.total_pnl += pnl - (current_price * self.transaction_cost)
                self.trades.append({'type': 'close_long', 'price': current_price, 'pnl': pnl})
            if self.position != -1:  # Open short
                self.position = -1
                self.entry_price = current_price
                self.balance -= current_price * self.transaction_cost
                
        else:  # HOLD (action == 0)
            if self.position == 1:  # Close long
                pnl = (current_price - self.entry_price) * self.max_position_size
                self.total_pnl += pnl - (current_price * self.transaction_cost)
                self.trades.append({'type': 'close_long', 'price': current_price, 'pnl': pnl})
                self.position = 0
            elif self.position == -1:  # Close short
                pnl = (self.entry_price - current_price) * self.max_position_size
                self.total_pnl += pnl - (current_price * self.transaction_cost)
                self.trades.append({'type': 'close_short', 'price': current_price, 'pnl': pnl})
                self.position = 0
        
        # Calculate reward (unrealized PnL + realized PnL)
        if self.position == 1:
            unrealized = (current_price - self.entry_price) / self.entry_price
        elif self.position == -1:
            unrealized = (self.entry_price - current_price) / self.entry_price
        else:
            unrealized = 0
            
        reward = (self.total_pnl / self.initial_balance) * 100 + unrealized * 10
        
        # Penalty for excessive trading
        if len(self.trades) > 0 and self.current_step > self.lookback_window + 1:
            trade_frequency = len(self.trades) / (self.current_step - self.lookback_window)
            if trade_frequency > 0.3:  # Too many trades
                reward -= 0.1
        
        # Move to next step
        self.current_step += 1
        
        # Check if done
        terminated = self.current_step >= len(self.data) - 1
        truncated = False
        
        info = {
            'total_pnl': self.total_pnl,
            'position': self.position,
            'trades': len(self.trades),
            'balance': self.balance + self.total_pnl
        }
        
        return self._get_observation(), reward, terminated, truncated, info
    
    def render(self, mode='human'):
        """Render current state."""
        if mode == 'human':
            price = self.data.iloc[self.current_step]['close']
            print(f"Step {self.current_step}: Price=${price:.2f}, Position={self.position}, PnL=${self.total_pnl:.2f}")
