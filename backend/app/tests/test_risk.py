"""Unit tests for the risk engine — the math the demo depends on."""

import pytest

from app.services.risk_engine import (
    calculate_risk,
    incident_score_from_reports,
    rainfall_mm_to_score,
)


def test_known_illustrative_example():
    """85/70/65/80 -> 0.35*85+0.25*70+0.20*65+0.20*80 = 76.25 (verified math)."""
    result = calculate_risk(85, 70, 65, 80)
    assert result["risk_score"] == 76.25
    assert result["risk_level"] == "High"
    assert result["explanation"] == {
        "rainfall_contribution": 29.75,
        "terrain_contribution": 17.5,
        "drainage_contribution": 13.0,
        "incident_contribution": 16.0,
    }


def test_all_zero_is_low():
    result = calculate_risk(0, 0, 0, 0)
    assert result["risk_score"] == 0.0
    assert result["risk_level"] == "Low"


def test_all_hundred_is_severe():
    result = calculate_risk(100, 100, 100, 100)
    assert result["risk_score"] == 100.0
    assert result["risk_level"] == "Severe"


def test_boundary_levels():
    assert calculate_risk(30, 30, 30, 30)["risk_level"] == "Medium"   # 30.0
    assert calculate_risk(60, 60, 60, 60)["risk_level"] == "High"     # 60.0
    assert calculate_risk(85, 85, 85, 85)["risk_level"] == "Severe"    # 85.0


def test_weights_sum_to_one():
    total = calculate_risk(50, 50, 50, 50)["risk_score"]
    assert total == 50.0  # linear: any equal inputs return that value


@pytest.mark.parametrize("bad", [-1, 101, 200])
def test_out_of_range_rejected(bad):
    with pytest.raises(ValueError):
        calculate_risk(bad, 50, 50, 50)


def test_simulated_flag_changes_confidence_not_score():
    real = calculate_risk(60, 60, 60, 60, is_simulated=False)
    sim = calculate_risk(60, 60, 60, 60, is_simulated=True)
    assert real["risk_score"] == sim["risk_score"]
    assert real["confidence"] == "High"
    assert sim["confidence"] == "Medium"
    assert sim["is_simulated"] is True


def test_rainfall_normalization():
    assert rainfall_mm_to_score(0) == 0.0
    assert rainfall_mm_to_score(30) == 50.0
    assert rainfall_mm_to_score(60) == 100.0
    assert rainfall_mm_to_score(120) == 100.0  # capped


def test_incident_score_severity_and_verification():
    open_incidents = [
        {"severity": "high", "verified": False},     # 35
        {"severity": "medium", "verified": True},  # 20 * 1.5 = 30
    ]
    assert incident_score_from_reports(open_incidents) == 65.0


def test_incident_score_capped_at_100():
    many = [{"severity": "critical", "verified": True} for _ in range(5)]
    assert incident_score_from_reports(many) == 100.0
