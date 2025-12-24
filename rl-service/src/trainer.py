"""
RL Trainer - Real Training with stable-baselines3

Handles model training, saving, loading, and incremental updates.
Automatically uses GPU (CUDA) if available, otherwise CPU.
"""

import os
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path

import numpy as np
import pandas as pd

# Detect available device (GPU or CPU)
try:
    import torch
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Trainer] Using device: {DEVICE}" + (" (NVIDIA GPU)" if DEVICE == "cuda" else " (CPU)"))
except ImportError:
    DEVICE = "cpu"
    print("[Trainer] PyTorch not installed, will use CPU")

# Try to import RL libraries (gracefully handle if not installed)
try:
    from stable_baselines3 import PPO
    from stable_baselines3.common.callbacks import BaseCallback
    from stable_baselines3.common.vec_env import DummyVecEnv
    RL_AVAILABLE = True
except ImportError:
    RL_AVAILABLE = False
    print("[Trainer] stable-baselines3 not installed, using mock training")

from .trading_env import TradingEnv


# Model storage path
MODEL_DIR = Path("/tmp/rl_models")
MODEL_DIR.mkdir(exist_ok=True)


class TrainingProgressCallback(BaseCallback):
    """Callback to track training progress."""
    
    def __init__(self, total_timesteps: int, progress_tracker: Dict):
        super().__init__()
        self.total_timesteps = total_timesteps
        self.progress_tracker = progress_tracker
        
    def _on_step(self) -> bool:
        self.progress_tracker['current_step'] = self.num_timesteps
        self.progress_tracker['progress'] = self.num_timesteps / self.total_timesteps
        return True


class RLTrainer:
    """
    Real RL Trainer using stable-baselines3 PPO.
    
    Features:
    - Train on historical OHLCV data
    - Save/load models
    - Incremental training updates
    - Background async training
    """
    
    def __init__(self):
        self.model: Optional[PPO] = None
        self.model_id: Optional[str] = None
        self.last_trained: Optional[str] = None
        self.is_training = False
        self.progress = {'current_step': 0, 'progress': 0.0}
        
        # Try to load existing model
        self._load_latest_model()
    
    def _load_latest_model(self):
        """Load the most recent saved model."""
        if not RL_AVAILABLE:
            return
            
        model_files = list(MODEL_DIR.glob("*.zip"))
        if model_files:
            latest = max(model_files, key=lambda p: p.stat().st_mtime)
            try:
                self.model = PPO.load(str(latest))
                self.model_id = latest.stem
                self.last_trained = datetime.fromtimestamp(latest.stat().st_mtime).isoformat()
                print(f"[Trainer] Loaded model: {self.model_id}")
            except Exception as e:
                print(f"[Trainer] Failed to load model: {e}")
    
    def is_model_loaded(self) -> bool:
        """Check if a model is loaded."""
        return self.model is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get current model information."""
        return {
            'model_loaded': self.model is not None,
            'model_id': self.model_id,
            'last_trained': self.last_trained,
            'is_training': self.is_training,
            'progress': self.progress['progress']
        }
    
    def _prepare_data(self, raw_data: list) -> pd.DataFrame:
        """Convert raw kline data to DataFrame."""
        # Handle different data formats
        if isinstance(raw_data[0], dict):
            df = pd.DataFrame(raw_data)
            # Normalize column names
            col_map = {
                'o': 'open', 'h': 'high', 'l': 'low', 'c': 'close', 'v': 'volume',
                'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'
            }
            df.rename(columns=col_map, inplace=True)
        else:
            # Assume list of [open, high, low, close, volume]
            df = pd.DataFrame(raw_data, columns=['open', 'high', 'low', 'close', 'volume'])
        
        # Ensure numeric types
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        df.dropna(inplace=True)
        return df
    
    def train(
        self,
        data: list,
        symbol: str = "BTCUSDT",
        total_timesteps: int = 50000,
        learning_rate: float = 0.0003,
    ) -> Dict[str, Any]:
        """
        Train a new model on historical data.
        
        Args:
            data: List of OHLCV dictionaries or arrays
            symbol: Trading symbol
            total_timesteps: Number of training steps
            learning_rate: PPO learning rate
            
        Returns:
            Training result with model_id and metrics
        """
        if not RL_AVAILABLE:
            # Mock training if libraries not available
            self.model_id = f"mock-{symbol.lower()}-{datetime.now().strftime('%Y%m%d%H%M')}"
            self.last_trained = datetime.now().isoformat()
            return {
                'success': True,
                'model_id': self.model_id,
                'metrics': {'win_rate': 0.55, 'sharpe': 1.2, 'max_drawdown': 0.15},
                'message': 'Mock training (stable-baselines3 not installed)'
            }
        
        self.is_training = True
        self.progress = {'current_step': 0, 'progress': 0.0}
        
        try:
            print(f"[Trainer] Starting training for {symbol} with {len(data)} data points")
            
            # Prepare data
            df = self._prepare_data(data)
            if len(df) < 100:
                raise ValueError(f"Insufficient data: {len(df)} rows (need 100+)")
            
            print(f"[Trainer] Data prepared: {len(df)} rows")
            
            # Create environment
            env = TradingEnv(df)
            vec_env = DummyVecEnv([lambda: env])
            
            # Create PPO model (uses GPU if available, else CPU)
            print(f"[Trainer] Creating PPO model on device: {DEVICE}")
            self.model = PPO(
                "MlpPolicy",
                vec_env,
                learning_rate=learning_rate,
                n_steps=2048,
                batch_size=64,
                n_epochs=10,
                gamma=0.99,
                gae_lambda=0.95,
                clip_range=0.2,
                verbose=1,
                device=DEVICE  # Use GPU if available, else CPU
            )
            
            # Training callback
            callback = TrainingProgressCallback(total_timesteps, self.progress)
            
            # Train
            print(f"[Trainer] Training for {total_timesteps} timesteps...")
            self.model.learn(
                total_timesteps=total_timesteps,
                callback=callback,
                progress_bar=True
            )
            
            # Generate model ID and save
            self.model_id = f"ppo-{symbol.lower()}-{datetime.now().strftime('%Y%m%d%H%M')}"
            model_path = MODEL_DIR / f"{self.model_id}.zip"
            self.model.save(str(model_path))
            self.last_trained = datetime.now().isoformat()
            
            print(f"[Trainer] Model saved: {model_path}")
            
            # Calculate metrics from training
            metrics = self._evaluate_model(df)
            
            return {
                'success': True,
                'model_id': self.model_id,
                'metrics': metrics,
                'message': f'Training completed: {total_timesteps} timesteps'
            }
            
        except Exception as e:
            print(f"[Trainer] Training failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            self.is_training = False
            self.progress = {'current_step': total_timesteps, 'progress': 1.0}
    
    def update(self, data: list, symbol: str = "BTCUSDT") -> Dict[str, Any]:
        """
        Incrementally update model with new data.
        
        Args:
            data: New OHLCV data
            symbol: Trading symbol
            
        Returns:
            Update result
        """
        if self.model is None:
            return {'success': False, 'error': 'No model loaded'}
        
        if not RL_AVAILABLE:
            self.last_trained = datetime.now().isoformat()
            return {'success': True, 'message': 'Mock update'}
        
        try:
            df = self._prepare_data(data)
            env = TradingEnv(df)
            vec_env = DummyVecEnv([lambda: env])
            
            # Set the new environment
            self.model.set_env(vec_env)
            
            # Short incremental training
            self.model.learn(total_timesteps=10000, reset_num_timesteps=False)
            
            # Save updated model
            model_path = MODEL_DIR / f"{self.model_id}.zip"
            self.model.save(str(model_path))
            self.last_trained = datetime.now().isoformat()
            
            return {'success': True, 'message': 'Model updated'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def predict(self, observation: np.ndarray) -> tuple:
        """
        Get prediction from trained model.
        
        Args:
            observation: Current state observation
            
        Returns:
            (action, confidence)
        """
        if self.model is None:
            # Default to HOLD if no model
            return 0, 0.5
        
        if not RL_AVAILABLE:
            # Mock prediction
            return np.random.choice([0, 1, 2]), 0.6
        
        action, _ = self.model.predict(observation, deterministic=True)
        
        # Get action probabilities for confidence
        obs_tensor = self.model.policy.obs_to_tensor(observation.reshape(1, -1))[0]
        with self.model.policy.no_grad():
            action_probs = self.model.policy.get_distribution(obs_tensor).distribution.probs
        
        confidence = float(action_probs[0, action].cpu().numpy())
        
        return int(action), confidence
    
    def _evaluate_model(self, df: pd.DataFrame) -> Dict[str, float]:
        """Evaluate model on data and return metrics."""
        if self.model is None:
            return {'win_rate': 0, 'sharpe': 0, 'max_drawdown': 0}
        
        env = TradingEnv(df)
        obs, _ = env.reset()
        
        returns = []
        done = False
        
        while not done:
            action, _ = self.model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            returns.append(reward)
            done = terminated or truncated
        
        returns = np.array(returns)
        
        # Calculate metrics
        win_rate = np.sum(returns > 0) / len(returns) if len(returns) > 0 else 0
        sharpe = np.mean(returns) / (np.std(returns) + 1e-10) * np.sqrt(252)
        cum_returns = np.cumsum(returns)
        running_max = np.maximum.accumulate(cum_returns)
        drawdown = (running_max - cum_returns) / (running_max + 1e-10)
        max_drawdown = np.max(drawdown) if len(drawdown) > 0 else 0
        
        return {
            'win_rate': float(win_rate),
            'sharpe': float(sharpe),
            'max_drawdown': float(max_drawdown),
            'total_trades': len(env.trades),
            'total_pnl': float(info.get('total_pnl', 0))
        }


# Global trainer instance
trainer = RLTrainer()
