import json
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Machine


router = APIRouter(
    prefix="/prediction",
    tags=["Risk Prediction"]
)


# ======================================================
# PATHS
# ======================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

ML_SCRIPT = PROJECT_ROOT / "ml" / "predict.py"


# ======================================================
# AVAILABLE MODELS
# ======================================================

AVAILABLE_MODELS = {
    "random_forest": "Random Forest",
    "decision_tree": "Decision Tree",
    "gradient_boosting": "Gradient Boosting",
    "extra_trees": "Extra Trees",
    "logistic_regression": "Logistic Regression"
}


# ======================================================
# PREDICT MACHINE RISK
# ======================================================

@router.post("/{machine_id}")
def predict_machine_risk(
    machine_id: int,
    model_name: str = "random_forest",
    db: Session = Depends(get_db)
):

    # --------------------------------------------------
    # Validate model
    # --------------------------------------------------

    if model_name not in AVAILABLE_MODELS:

        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid model selected",
                "available_models": list(
                    AVAILABLE_MODELS.keys()
                )
            }
        )

    # --------------------------------------------------
    # Find machine
    # --------------------------------------------------

    machine = (
        db.query(Machine)
        .filter(
            Machine.id == machine_id
        )
        .first()
    )

    if not machine:

        raise HTTPException(
            status_code=404,
            detail="Machine not found"
        )

    # --------------------------------------------------
    # Read machine values
    # --------------------------------------------------

    values = json.loads(
        machine.field_values
    )

    # --------------------------------------------------
    # Current ML features
    # --------------------------------------------------

    required_ml_fields = [
        "Temperature",
        "Pressure",
        "Vibration"
    ]

    missing_fields = [
        field
        for field in required_ml_fields
        if field not in values
    ]

    if missing_fields:

        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "The selected ML models require "
                    "Temperature, Pressure, and "
                    "Vibration."
                ),
                "missing_fields": missing_fields
            }
        )

    # --------------------------------------------------
    # Validate input values
    # --------------------------------------------------

    try:

        temperature = float(
            values["Temperature"]
        )

        pressure = float(
            values["Pressure"]
        )

        vibration = str(
            values["Vibration"]
        )

    except (ValueError, TypeError) as exc:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid Temperature, Pressure, "
                "or Vibration value."
            )
        ) from exc

    # --------------------------------------------------
    # Validate vibration
    # --------------------------------------------------

    if vibration not in {
        "Low",
        "Medium",
        "High"
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "Vibration must be Low, "
                "Medium, or High."
            )
        )

    # --------------------------------------------------
    # Check prediction script
    # --------------------------------------------------

    if not ML_SCRIPT.exists():

        raise HTTPException(
            status_code=500,
            detail=(
                "ML prediction script not found."
            )
        )

    # --------------------------------------------------
    # Run local Python ML model
    # --------------------------------------------------

    try:

        result = subprocess.run(
            [
                sys.executable,
                str(ML_SCRIPT),

                "--model",
                model_name,

                "--temperature",
                str(temperature),

                "--pressure",
                str(pressure),

                "--vibration",
                vibration
            ],

            capture_output=True,
            text=True,
            check=True
        )

        prediction = json.loads(
            result.stdout.strip()
        )

    except subprocess.CalledProcessError as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "ML prediction failed: "
                + exc.stderr
            )
        ) from exc

    except json.JSONDecodeError as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Invalid response from "
                "ML prediction service."
            )
        ) from exc

    # --------------------------------------------------
    # Return prediction
    # --------------------------------------------------

    return {
        "machine_id": machine.id,

        "model": {
            "key": model_name,
            "name": AVAILABLE_MODELS[
                model_name
            ]
        },

        "risk_level": prediction[
            "risk_level"
        ],

        "inputs_used": {
            "Temperature": temperature,
            "Pressure": pressure,
            "Vibration": vibration
        },

        "note": (
            "Additional dynamic fields are stored "
            "and available to the application, "
            "but the current ML models use "
            "Temperature, Pressure, and Vibration."
        )
    }


# ======================================================
# GET AVAILABLE MODELS
# ======================================================

@router.get("/models/list")
def get_available_models():

    return {
        "models": [
            {
                "key": key,
                "name": name
            }

            for key, name
            in AVAILABLE_MODELS.items()
        ]
    }