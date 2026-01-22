from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import date

class ForecastInput(BaseModel):
    sku: str
    date: date
    historical_usage: float
    events: List[Dict[str, Any]]
    promotions: List[Dict[str, Any]]
    seasonality_factors: Optional[Dict[str, Any]] = None

class ForecastPoint(BaseModel):
    date: date
    forecast: float
    lower_bound: float
    upper_bound: float
    confidence: float

class ForecastRecord(BaseModel):
    sku: str
    horizon_days: int
    last_updated: str  # timestamp

class ReorderSuggestion(BaseModel):
    sku: str
    recommended_order_qty: float
    reorder_point: float
    safety_stock: float
    lead_time_days: int
    justification: str