"""Explainable, rule-based flood-risk engine.

The score is a transparent weighted sum of four normalized (0-100) inputs:

    R = 0.35 * P  (rainfall indicator)
      + 0.25 * T  (terrain / low-elevation indicator)
      + 0.20 * D  (drainage / water-proximity indicator)
      + 0.20 * I  (verified incident evidence)

Every score carries an `explanation` with each input's contribution, so the
UI can show WHY a zone was ranked — this is decision support, not a black
box. The same inputs always produce the same score.
"""

from typing import Any

WEIGHTS = {
    "rainfall": 0.35,
    "terrain": 0.25,
    "drainage": 0.20,
    "incident": 0.20,
}

SEVERITY_POINTS = {"low": 10, "medium": 20, "high": 35, "critical": 50}


def _validate(name: str, value: float) -> None:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError(f"{name} must be a number")
    if not 0 <= value <= 100:
        raise ValueError(f"{name} must be between 0 and 100")


def calculate_risk(
    rainfall_score: float,
    terrain_score: float,
    drainage_score: float,
    incident_score: float,
    is_simulated: bool = False,
) -> dict[str, Any]:
    """Return an explainable risk assessment for one zone at one point in time."""
    values = {
        "rainfall": rainfall_score,
        "terrain": terrain_score,
        "drainage": drainage_score,
        "incident": incident_score,
    }
    for name, value in values.items():
        _validate(name, value)

    contributions = {
        "rainfall_contribution": round(rainfall_score * WEIGHTS["rainfall"], 2),
        "terrain_contribution": round(terrain_score * WEIGHTS["terrain"], 2),
        "drainage_contribution": round(drainage_score * WEIGHTS["drainage"], 2),
        "incident_contribution": round(incident_score * WEIGHTS["incident"], 2),
    }

    score = round(sum(contributions.values()), 2)

    if score >= 85:
        level = "Severe"
    elif score >= 60:
        level = "High"
    elif score >= 30:
        level = "Medium"
    else:
        level = "Low"

    return {
        "risk_score": score,
        "risk_level": level,
        "confidence": "Medium" if is_simulated else "High",
        "is_simulated": is_simulated,
        "inputs": {k: round(v, 2) for k, v in values.items()},
        "explanation": contributions,
        "formula": "R = 0.35*P + 0.25*T + 0.20*D + 0.20*I",
    }


def rainfall_mm_to_score(accumulated_mm: float) -> float:
    """Documented normalization of accumulated rainfall to a 0-100 indicator.

    Mapping (linear, capped): 0 mm -> 0, 60 mm or more -> 100.
    Chosen from typical urban waterlogging thresholds: light (<5 mm),
    moderate (5-20 mm), heavy (20-50 mm), very heavy (>50 mm) per 3 h.
    """
    if accumulated_mm <= 0:
        return 0.0
    return round(min(100.0, (accumulated_mm / 60.0) * 100.0), 2)


def incident_score_from_reports(open_incidents: list[dict]) -> float:
    """0-100 incident-evidence indicator from open incidents in a zone.

    Severity points: low=10, medium=20, high=35, critical=50.
    Verified reports count 1.5x. Capped at 100.
    """
    total = 0.0
    for inc in open_incidents:
        points = SEVERITY_POINTS.get(inc.get("severity", "medium"), 20)
        if inc.get("verified"):
            points *= 1.5
        total += points
    return round(min(100.0, total), 2)
