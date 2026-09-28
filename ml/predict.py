import argparse
import json
from pathlib import Path

import joblib


# ======================================================
# PATHS
# ======================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = BASE_DIR / "models"


# ======================================================
# AVAILABLE MODELS
# ======================================================

MODEL_FILES = {
    "random_forest": "random_forest.pkl",
    "decision_tree": "decision_tree.pkl",
    "gradient_boosting": "gradient_boosting.pkl",
    "extra_trees": "extra_trees.pkl",
    "logistic_regression": "logistic_regression.pkl"
}


# ======================================================
# PREDICT RISK
# ======================================================

def predict_risk(
    model_name,
    temperature,
    pressure,
    vibration
):

    # --------------------------------------------------
    # Validate model
    # --------------------------------------------------

    if model_name not in MODEL_FILES:

        raise ValueError(
            "Unknown model. Available models: "
            + ", ".join(
                MODEL_FILES.keys()
            )
        )

    # --------------------------------------------------
    # Validate vibration
    # --------------------------------------------------

    if vibration not in {
        "Low",
        "Medium",
        "High"
    }:

        raise ValueError(
            "Vibration must be "
            "Low, Medium, or High"
        )

    # --------------------------------------------------
    # Convert vibration
    # --------------------------------------------------

    vibration_mapping = {
        "Low": 0,
        "Medium": 1,
        "High": 2
    }

    vibration_value = (
        vibration_mapping[vibration]
    )

    # --------------------------------------------------
    # Find model
    # --------------------------------------------------

    model_path = (
        MODEL_DIR
        / MODEL_FILES[model_name]
    )

    if not model_path.exists():

        raise FileNotFoundError(
            f"Model file not found: "
            f"{model_path}"
        )

    # --------------------------------------------------
    # Load model
    # --------------------------------------------------

    model = joblib.load(
        model_path
    )

    # --------------------------------------------------
    # Prepare input
    # --------------------------------------------------

    input_data = [
        [
            float(temperature),
            float(pressure),
            vibration_value
        ]
    ]

    # --------------------------------------------------
    # Prediction
    # --------------------------------------------------

    result = model.predict(
        input_data
    )[0]

    return result


# ======================================================
# MAIN
# ======================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "Local machine risk prediction"
        )
    )

    parser.add_argument(
        "--model",
        type=str,
        required=True
    )

    parser.add_argument(
        "--temperature",
        type=float,
        required=True
    )

    parser.add_argument(
        "--pressure",
        type=float,
        required=True
    )

    parser.add_argument(
        "--vibration",
        type=str,
        required=True
    )

    args = parser.parse_args()

    risk = predict_risk(
        model_name=args.model,
        temperature=args.temperature,
        pressure=args.pressure,
        vibration=args.vibration
    )

    print(
        json.dumps({
            "model": args.model,
            "risk_level": risk
        })
    )


if __name__ == "__main__":
    main()