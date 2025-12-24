"""
RL Trading Service - Main Application

FastAPI application that provides RL model predictions with SMC + Volume analysis.
"""

import os
import random
import uuid
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .features import (
    SMCFeatures,
    VolumeFeatures,
    score_smc_bias,
    score_volume_confirmation,
    calculate_enhanced_confidence,
    should_prefer_hold,
    calculate_trade_levels
)


# ============================================================================
# Pydantic Models (matching backend expectations)
# ============================================================================

class PredictRequest(BaseModel):
    """Request body for prediction endpoint."""
    symbol: str
    features: list[float]
    # Enhanced features for SMC + Volume analysis
    smc: Optional[SMCFeatures] = None
    volume: Optional[VolumeFeatures] = None
    methodology: str = "SMC"  # SMC | ICT | Gann
    currentPrice: Optional[float] = None  # Current market price


class RLPrediction(BaseModel):
    """RL model prediction response."""
    action: str = Field(..., pattern="^(LONG|SHORT|HOLD)$")
    confidence: float = Field(..., ge=0, le=1)
    expectedReturn: float
    modelVersion: str
    # Enhanced response with reasoning
    reasoning: Optional[str] = None
    smcAnalysis: Optional[str] = None
    volumeAnalysis: Optional[str] = None
    # Trade parameters
    entry: Optional[float] = None
    stopLoss: Optional[float] = None
    takeProfit: Optional[float] = None
    riskRewardRatio: Optional[float] = None


class RLMetrics(BaseModel):
    """RL model performance metrics."""
    sharpeRatio: float
    winRate: float
    maxDrawdown: float
    totalReturn: float
    trainingStatus: str


class RLParams(BaseModel):
    """RL model hyperparameters."""
    learning_rate: Optional[float] = None
    gamma: Optional[float] = None
    batch_size: Optional[int] = None
    total_timesteps: Optional[int] = None
    algorithm: Optional[str] = None


class TrainRequest(BaseModel):
    """Training configuration request."""
    symbols: Optional[list[str]] = None
    timesteps: Optional[int] = None
    algorithm: Optional[str] = None


class TrainResponse(BaseModel):
    """Training job response."""
    jobId: str


class StopRequest(BaseModel):
    """Stop training request."""
    reason: Optional[str] = None


class TrainingStatus(BaseModel):
    """Training job status."""
    status: str
    progress: float
    currentEpisode: int
    totalEpisodes: int


# ============================================================================
# In-Memory State (for mock implementation)
# ============================================================================

class RLState:
    """Holds the current state of the RL service."""
    
    def __init__(self):
        self.model_version = "v1.1.0-smc"  # Updated version with SMC
        self.training_status = "idle"
        self.training_job_id: Optional[str] = None
        self.training_progress = 0.0
        self.current_episode = 0
        self.total_episodes = 0
        self.params = RLParams(
            learning_rate=0.0003,
            gamma=0.99,
            batch_size=64,
            total_timesteps=100000,
            algorithm="PPO"
        )
        # Simulated metrics (would come from actual model in production)
        self.metrics = RLMetrics(
            sharpeRatio=1.35,  # Improved with SMC
            winRate=0.62,
            maxDrawdown=0.10,
            totalReturn=0.38,
            trainingStatus="idle"
        )


rl_state = RLState()


# ============================================================================
# Application Lifecycle
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    print(f"[{datetime.now().isoformat()}] RL Trading Service starting...")
    print(f"[{datetime.now().isoformat()}] Model version: {rl_state.model_version}")
    print(f"[{datetime.now().isoformat()}] Features: SMC + Volume Analysis enabled")
    yield
    print(f"[{datetime.now().isoformat()}] RL Trading Service shutting down...")


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="RL Trading Service",
    description="Reinforcement Learning Trading Model API with SMC + Volume Analysis",
    version="1.1.0",
    lifespan=lifespan
)

# CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health & Info Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "features": ["smc", "volume", "ote", "kill_zones"]
    }


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": "RL Trading Service",
        "version": "1.1.0",
        "model_version": rl_state.model_version,
        "status": rl_state.training_status,
        "features": {
            "smc": ["order_blocks", "fvg", "bos", "ote"],
            "volume": ["volume_ratio", "liquidity"],
            "kill_zones": ["london", "new_york", "asian"]
        }
    }


# ============================================================================
# Prediction Endpoint (Enhanced with SMC + Volume)
# ============================================================================

@app.post("/predict", response_model=RLPrediction)
async def predict(request: PredictRequest):
    """
    Get RL model prediction with SMC + Volume analysis.
    
    The prediction process:
    1. Base signal from technical features (RSI, MACD, etc.)
    2. SMC bias scoring (Order Blocks, FVG, BOS, OTE, Kill Zones)
    3. Volume confirmation scoring
    4. Final confidence adjustment
    """
    # Extract current price from features or request
    current_price = request.currentPrice
    if not current_price and request.features:
        # Assume first feature might be price, or use a placeholder
        current_price = request.features[0] if request.features else 50000
    
    # ========== STEP 1: Base prediction from features ==========
    feature_sum = sum(request.features) if request.features else 0
    
    # Normalize feature sum for RSI-like features (assume 50 is neutral)
    if request.features and len(request.features) > 0:
        # If features contain RSI (typically 0-100), normalize
        first_feature = request.features[0]
        if 0 <= first_feature <= 100:
            # RSI-style normalization
            feature_bias = (first_feature - 50) / 50  # -1 to 1
        else:
            # Raw feature sum normalized
            feature_bias = feature_sum / max(abs(feature_sum), 1)
    else:
        feature_bias = 0
    
    # Determine base action
    if feature_bias > 0.2:
        base_action = "LONG"
        base_confidence = min(0.5 + abs(feature_bias) * 0.3, 0.75)
    elif feature_bias < -0.2:
        base_action = "SHORT"
        base_confidence = min(0.5 + abs(feature_bias) * 0.3, 0.75)
    else:
        base_action = "HOLD"
        base_confidence = 0.55
    
    # ========== STEP 2: SMC Bias Scoring ==========
    smc_modifier = 1.0
    smc_reason = "No SMC data"
    
    if request.smc and base_action != "HOLD":
        smc_modifier, smc_reason = score_smc_bias(
            request.smc,
            current_price,
            base_action
        )
        print(f"[SMC] {request.symbol}: {smc_reason} (modifier: {smc_modifier:.2f})")
    
    # ========== STEP 3: Volume Confirmation ==========
    volume_modifier = 1.0
    volume_reason = "No volume data"
    
    if request.volume:
        volume_modifier, volume_reason = score_volume_confirmation(
            request.volume,
            base_action
        )
        print(f"[Volume] {request.symbol}: {volume_reason} (modifier: {volume_modifier:.2f})")
    
    # ========== STEP 4: Check for HOLD override ==========
    if request.smc and request.volume and base_action != "HOLD":
        should_hold, hold_reason = should_prefer_hold(
            request.smc,
            request.volume,
            base_confidence
        )
        if should_hold:
            print(f"[Override] Switching to HOLD: {hold_reason}")
            base_action = "HOLD"
            base_confidence = 0.6
            smc_modifier = 1.0
            volume_modifier = 1.0
            smc_reason = hold_reason
    
    # ========== STEP 5: Calculate final confidence ==========
    final_confidence, full_reasoning = calculate_enhanced_confidence(
        base_confidence,
        smc_modifier,
        volume_modifier,
        smc_reason,
        volume_reason
    )
    
    # Calculate expected return based on confidence and modifiers
    if base_action != "HOLD":
        # Higher SMC/Volume alignment = higher expected return
        expected_return = (final_confidence - 0.5) * 0.15 * smc_modifier
    else:
        expected_return = 0.0
    
    # Add slight randomness for realistic variance
    final_confidence = min(max(
        final_confidence + random.uniform(-0.03, 0.03),
        0.2
    ), 0.95)
    
    print(f"[Prediction] {request.symbol}: {base_action} @ {final_confidence:.1%} confidence")
    
    # ========== STEP 6: Calculate trade levels (Entry/SL/TP) ==========
    trade_levels = {}
    if base_action != "HOLD" and request.smc:
        # Extract ATR from features if available (typically index 6)
        atr = request.features[6] if len(request.features) > 6 else 0
        
        trade_levels = calculate_trade_levels(
            action=base_action,
            current_price=current_price,
            smc=request.smc,
            atr=atr,
            confidence=final_confidence
        )
        
        if trade_levels:
            print(f"[Trade Levels] Entry: ${trade_levels['entry']:.2f}, SL: ${trade_levels['stopLoss']:.2f}, TP: ${trade_levels['takeProfit']:.2f}, RR: {trade_levels['riskRewardRatio']:.1f}")
    
    return RLPrediction(
        action=base_action,
        confidence=round(final_confidence, 4),
        expectedReturn=round(expected_return, 4),
        modelVersion=rl_state.model_version,
        reasoning=full_reasoning,
        smcAnalysis=smc_reason,
        volumeAnalysis=volume_reason,
        entry=trade_levels.get("entry"),
        stopLoss=trade_levels.get("stopLoss"),
        takeProfit=trade_levels.get("takeProfit"),
        riskRewardRatio=trade_levels.get("riskRewardRatio")
    )


# ============================================================================
# Metrics Endpoint
# ============================================================================

@app.get("/metrics", response_model=RLMetrics)
async def get_metrics():
    """
    Get current RL model performance metrics.
    
    In production, these would be calculated from actual trading results.
    """
    # Update training status in metrics
    rl_state.metrics.trainingStatus = rl_state.training_status
    return rl_state.metrics


# ============================================================================
# Parameter Management
# ============================================================================

@app.put("/params")
async def update_params(params: RLParams):
    """
    Update RL model hyperparameters.
    
    In production, this would update the model's training configuration.
    """
    if params.learning_rate is not None:
        rl_state.params.learning_rate = params.learning_rate
    if params.gamma is not None:
        rl_state.params.gamma = params.gamma
    if params.batch_size is not None:
        rl_state.params.batch_size = params.batch_size
    if params.total_timesteps is not None:
        rl_state.params.total_timesteps = params.total_timesteps
    if params.algorithm is not None:
        rl_state.params.algorithm = params.algorithm
    
    print(f"[{datetime.now().isoformat()}] Parameters updated: {params.model_dump(exclude_none=True)}")
    
    return {"success": True, "params": rl_state.params.model_dump()}


@app.get("/params")
async def get_params():
    """Get current RL model parameters."""
    return rl_state.params.model_dump()


# ============================================================================
# Training Management
# ============================================================================

@app.post("/train", response_model=TrainResponse)
async def start_training(config: TrainRequest = TrainRequest()):
    """
    Start model training.
    
    In production, this would:
    1. Spawn a background training job
    2. Use stable-baselines3 to train the model
    3. Save checkpoints periodically
    """
    if rl_state.training_status == "training":
        raise HTTPException(
            status_code=409,
            detail="Training already in progress"
        )
    
    job_id = str(uuid.uuid4())
    rl_state.training_job_id = job_id
    rl_state.training_status = "training"
    rl_state.training_progress = 0.0
    rl_state.current_episode = 0
    rl_state.total_episodes = config.timesteps or rl_state.params.total_timesteps or 100000
    
    print(f"[{datetime.now().isoformat()}] Training started: job_id={job_id}")
    print(f"    Symbols: {config.symbols or ['BTC-USD']}")
    print(f"    Timesteps: {rl_state.total_episodes}")
    print(f"    Algorithm: {config.algorithm or rl_state.params.algorithm}")
    
    return TrainResponse(jobId=job_id)


@app.post("/stop")
async def stop_training(request: StopRequest = StopRequest()):
    """Stop ongoing training."""
    if rl_state.training_status != "training":
        return {"success": False, "message": "No training in progress"}
    
    print(f"[{datetime.now().isoformat()}] Training stopped. Reason: {request.reason or 'User requested'}")
    
    rl_state.training_status = "stopped"
    rl_state.training_job_id = None
    
    return {"success": True, "message": "Training stopped"}


@app.get("/training/status", response_model=TrainingStatus)
async def get_training_status():
    """Get current training status and progress."""
    # Simulate progress if training
    if rl_state.training_status == "training":
        # Increment progress for demo (in production, this would reflect actual training)
        rl_state.training_progress = min(rl_state.training_progress + 0.01, 1.0)
        rl_state.current_episode = int(rl_state.training_progress * rl_state.total_episodes)
        
        if rl_state.training_progress >= 1.0:
            rl_state.training_status = "completed"
            print(f"[{datetime.now().isoformat()}] Training completed!")
    
    return TrainingStatus(
        status=rl_state.training_status,
        progress=round(rl_state.training_progress, 4),
        currentEpisode=rl_state.current_episode,
        totalEpisodes=rl_state.total_episodes
    )


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
