"""
Feature extraction and scoring for SMC + Volume analysis.

This module provides the intelligence layer that converts raw SMC/Volume data
into actionable trading signals with confidence scoring.
"""

from typing import Optional
from pydantic import BaseModel


# ============================================================================
# Feature Models
# ============================================================================

class OrderBlock(BaseModel):
    """SMC Order Block structure."""
    type: str = "BULLISH"  # BULLISH | BEARISH
    high: float = 0
    low: float = 0
    strength: float = 0
    index: Optional[int] = None


class FairValueGap(BaseModel):
    """SMC Fair Value Gap structure."""
    type: str = "BULLISH"  # BULLISH | BEARISH
    high: float = 0
    low: float = 0
    size: float = 0


class SMCFeatures(BaseModel):
    """Smart Money Concepts features from backend."""
    orderBlocks: list[dict] = []
    fairValueGaps: list[dict] = []
    bosDirection: str = "NONE"  # BULLISH | BEARISH | NONE
    oteZone: Optional[dict] = None  # {high, low, direction}
    killZone: str = "NONE"  # LONDON | NEW_YORK | ASIAN | NONE
    smcBias: str = "NONE"


class VolumeFeatures(BaseModel):
    """Volume analysis features."""
    volumeRatio: float = 1.0  # Current vs 20-period average
    avgVolume: float = 0
    currentVolume: float = 0


# ============================================================================
# SMC Analysis Functions
# ============================================================================

def get_nearest_order_block(
    order_blocks: list[dict],
    current_price: float,
    block_type: str = "BULLISH"
) -> Optional[dict]:
    """
    Find the nearest order block of specified type.
    
    For BULLISH entries, we want bullish OBs below price (support).
    For BEARISH entries, we want bearish OBs above price (resistance).
    """
    filtered = [ob for ob in order_blocks if ob.get("type") == block_type]
    
    if block_type == "BULLISH":
        # Look for bullish OBs below price
        below_price = [ob for ob in filtered if ob.get("high", 0) < current_price]
        if below_price:
            return max(below_price, key=lambda x: x.get("high", 0))
    else:
        # Look for bearish OBs above price
        above_price = [ob for ob in filtered if ob.get("low", 0) > current_price]
        if above_price:
            return min(above_price, key=lambda x: x.get("low", 0))
    
    return None


def is_in_fvg(fair_value_gaps: list[dict], current_price: float) -> Optional[dict]:
    """Check if price is currently in a Fair Value Gap."""
    for fvg in fair_value_gaps:
        low = fvg.get("low", 0)
        high = fvg.get("high", 0)
        if low <= current_price <= high:
            return fvg
    return None


def score_smc_bias(
    smc: SMCFeatures,
    current_price: float,
    base_action: str
) -> tuple[float, str]:
    """
    Score the SMC alignment with the proposed trade direction.
    
    Returns:
        (confidence_modifier, reasoning)
        
    Confidence modifier:
        > 1.0 = SMC confirms trade direction
        < 1.0 = SMC conflicts with trade direction
        = 1.0 = Neutral
    """
    reasons = []
    modifier = 1.0
    
    # 1. Break of Structure alignment
    if smc.bosDirection == "BULLISH" and base_action == "LONG":
        modifier += 0.15
        reasons.append("BOS confirms bullish bias")
    elif smc.bosDirection == "BEARISH" and base_action == "SHORT":
        modifier += 0.15
        reasons.append("BOS confirms bearish bias")
    elif smc.bosDirection != "NONE":
        if (smc.bosDirection == "BULLISH" and base_action == "SHORT") or \
           (smc.bosDirection == "BEARISH" and base_action == "LONG"):
            modifier -= 0.2
            reasons.append(f"BOS conflicts (market {smc.bosDirection})")
    
    # 2. Order Block proximity (within 2% of price)
    ob_type = "BULLISH" if base_action == "LONG" else "BEARISH"
    nearest_ob = get_nearest_order_block(smc.orderBlocks, current_price, ob_type)
    
    if nearest_ob:
        ob_mid = (nearest_ob.get("high", 0) + nearest_ob.get("low", 0)) / 2
        distance_pct = abs(current_price - ob_mid) / current_price
        
        if distance_pct < 0.02:  # Within 2%
            strength = nearest_ob.get("strength", 0)
            modifier += min(strength * 5, 0.2)  # Up to 0.2 boost
            reasons.append(f"Near {ob_type} OB (strength: {strength:.1%})")
    
    # 3. Fair Value Gap - price magnet effect
    current_fvg = is_in_fvg(smc.fairValueGaps, current_price)
    if current_fvg:
        fvg_type = current_fvg.get("type", "")
        if (fvg_type == "BULLISH" and base_action == "LONG") or \
           (fvg_type == "BEARISH" and base_action == "SHORT"):
            modifier += 0.1
            reasons.append(f"In {fvg_type} FVG")
        else:
            modifier -= 0.1
            reasons.append(f"In opposing FVG ({fvg_type})")
    
    # 4. OTE Zone check
    if smc.oteZone:
        ote_high = smc.oteZone.get("high", 0)
        ote_low = smc.oteZone.get("low", 0)
        ote_direction = smc.oteZone.get("direction", "")
        
        if ote_low <= current_price <= ote_high:
            if "BULLISH" in ote_direction and base_action == "LONG":
                modifier += 0.15
                reasons.append("In OTE zone for long entry")
            elif "BEARISH" in ote_direction and base_action == "SHORT":
                modifier += 0.15
                reasons.append("In OTE zone for short entry")
    
    # 5. Kill Zone bonus
    if smc.killZone in ["LONDON", "NEW_YORK"]:
        modifier += 0.1
        reasons.append(f"{smc.killZone} kill zone active")
    elif smc.killZone == "ASIAN":
        modifier += 0.05
        reasons.append("Asian session (range likely)")
    
    reasoning = "; ".join(reasons) if reasons else "No SMC signals"
    return (modifier, reasoning)


def score_volume_confirmation(
    volume: VolumeFeatures,
    base_action: str
) -> tuple[float, str]:
    """
    Score volume confirmation for the trade.
    
    High volume = higher conviction.
    Low volume = suspicious move, lower confidence.
    
    Returns:
        (confidence_modifier, reasoning)
    """
    ratio = volume.volumeRatio
    
    if ratio >= 2.0:
        return (1.25, f"High volume confirmation ({ratio:.1f}x avg)")
    elif ratio >= 1.5:
        return (1.15, f"Above average volume ({ratio:.1f}x avg)")
    elif ratio >= 0.8:
        return (1.0, f"Normal volume ({ratio:.1f}x avg)")
    elif ratio >= 0.5:
        return (0.85, f"Below average volume ({ratio:.1f}x avg)")
    else:
        return (0.7, f"Very low volume - suspicious ({ratio:.1f}x avg)")


def calculate_enhanced_confidence(
    base_confidence: float,
    smc_modifier: float,
    volume_modifier: float,
    smc_reason: str,
    volume_reason: str
) -> tuple[float, str]:
    """
    Combine all modifiers into final confidence score.
    
    Returns:
        (final_confidence, full_reasoning)
    """
    # Apply modifiers multiplicatively
    raw_confidence = base_confidence * smc_modifier * volume_modifier
    
    # Clamp to valid range
    final_confidence = max(0.2, min(0.95, raw_confidence))
    
    reasoning = f"SMC: {smc_reason} | Volume: {volume_reason}"
    
    return (round(final_confidence, 4), reasoning)


def should_prefer_hold(
    smc: SMCFeatures,
    volume: VolumeFeatures,
    base_confidence: float
) -> tuple[bool, str]:
    """
    Determine if we should recommend HOLD despite having a signal.
    
    Strong anti-signals can override the base prediction.
    """
    # No kill zone and low volume = no conviction
    if smc.killZone == "NONE" and volume.volumeRatio < 0.5:
        return (True, "Outside kill zone with very low volume")
    
    # Strong BOS against with low base confidence
    if base_confidence < 0.55 and smc.bosDirection in ["BULLISH", "BEARISH"]:
        return (True, "Weak signal against market structure")
    
    return (False, "")


def calculate_trade_levels(
    action: str,
    current_price: float,
    smc: SMCFeatures,
    atr: float = 0,
    confidence: float = 0.5
) -> dict:
    """
    Calculate Entry, Stop Loss, and Take Profit levels based on SMC.
    
    Strategy:
    - Entry: Current price (market order) or near OB for limit
    - Stop Loss: Below nearest bullish OB (for LONG) or above bearish OB (for SHORT)
    - Take Profit: Based on RR ratio adjusted by confidence
    
    Returns:
        {entry, stopLoss, takeProfit, riskRewardRatio}
    """
    if action == "HOLD" or current_price <= 0:
        return {}
    
    # Default to ATR-based levels if no SMC data
    # Use 1% of price as fallback ATR
    atr = atr if atr > 0 else current_price * 0.01
    
    entry = current_price
    
    if action == "LONG":
        # Find nearest bullish Order Block for SL placement
        stop_loss = current_price - (atr * 1.5)  # Default: 1.5x ATR below
        
        # Check for bullish OB to place SL below
        bullish_obs = [ob for ob in smc.orderBlocks if ob.get("type") == "BULLISH"]
        if bullish_obs:
            # Get the nearest bullish OB below price
            below_price = [ob for ob in bullish_obs if ob.get("high", 0) < current_price]
            if below_price:
                nearest_ob = max(below_price, key=lambda x: x.get("high", 0))
                # Place SL just below the OB low
                stop_loss = nearest_ob.get("low", stop_loss) * 0.998  # 0.2% below OB low
        
        # Check for FVG as additional SL zone
        for fvg in smc.fairValueGaps:
            if fvg.get("type") == "BULLISH" and fvg.get("high", 0) < current_price:
                # Use FVG low as potential SL
                fvg_sl = fvg.get("low", 0) * 0.998
                if fvg_sl > stop_loss:  # Tighter SL
                    stop_loss = fvg_sl
        
        # Calculate risk
        risk = entry - stop_loss
        
        # TP based on confidence - higher confidence = higher RR target
        rr_ratio = 1.5 + (confidence * 2)  # 1.5 to 3.5 RR based on confidence
        take_profit = entry + (risk * rr_ratio)
        
    else:  # SHORT
        # Find nearest bearish Order Block for SL placement
        stop_loss = current_price + (atr * 1.5)  # Default: 1.5x ATR above
        
        # Check for bearish OB to place SL above
        bearish_obs = [ob for ob in smc.orderBlocks if ob.get("type") == "BEARISH"]
        if bearish_obs:
            # Get the nearest bearish OB above price
            above_price = [ob for ob in bearish_obs if ob.get("low", 0) > current_price]
            if above_price:
                nearest_ob = min(above_price, key=lambda x: x.get("low", 0))
                # Place SL just above the OB high
                stop_loss = nearest_ob.get("high", stop_loss) * 1.002  # 0.2% above OB high
        
        # Check for FVG as additional SL zone
        for fvg in smc.fairValueGaps:
            if fvg.get("type") == "BEARISH" and fvg.get("low", 0) > current_price:
                # Use FVG high as potential SL
                fvg_sl = fvg.get("high", 0) * 1.002
                if fvg_sl < stop_loss:  # Tighter SL
                    stop_loss = fvg_sl
        
        # Calculate risk
        risk = stop_loss - entry
        
        # TP based on confidence
        rr_ratio = 1.5 + (confidence * 2)
        take_profit = entry - (risk * rr_ratio)
    
    # Ensure valid values
    if stop_loss <= 0 or take_profit <= 0:
        return {}
    
    # Calculate actual RR ratio
    actual_risk = abs(entry - stop_loss)
    actual_reward = abs(take_profit - entry)
    actual_rr = actual_reward / actual_risk if actual_risk > 0 else 0
    
    return {
        "entry": round(entry, 2),
        "stopLoss": round(stop_loss, 2),
        "takeProfit": round(take_profit, 2),
        "riskRewardRatio": round(actual_rr, 2)
    }

