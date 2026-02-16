# Placeholder for Prophet-based forecasting workflow
from typing import List
from models import ForecastInput, ForecastPoint

def generate_forecast(inputs: List[ForecastInput], horizon_days: int = 90) -> List[ForecastPoint]:
    # TODO: Implement Prophet ensemble forecasting
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