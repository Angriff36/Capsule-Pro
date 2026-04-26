# Placeholder for Prophet-based forecasting workflow
from typing import List
from models import ForecastInput, ForecastPoint

def generate_forecast(inputs: List[ForecastInput], horizon_days: int = 90) -> List[ForecastPoint]:
    # BLOCKER: Prophet library integration not yet implemented.
    # Requires: prophet>=1.1, pandas, and training data pipeline.
    # Tracked as capsule-pro/TODO:forecasting-prophet-ensemble
    # For now, return dummy data
    return [
        ForecastPoint(
            date=inputs[0].date,
            forecast=100.0,
            lower_bound=80.0,
            upper_bound=120.0,
            confidence=0.95
        )
    ]