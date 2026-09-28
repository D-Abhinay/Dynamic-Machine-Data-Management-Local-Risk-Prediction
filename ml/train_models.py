from pathlib import Path
import csv
import json

import joblib
import numpy as np

from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    ExtraTreesClassifier
)
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


# ======================================================
# PATHS
# ======================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_PATH = BASE_DIR / "synthetic_machine_data.csv"

MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(exist_ok=True)


# ======================================================
# RISK LOGIC
# ======================================================

def calculate_risk(
    temperature,
    pressure,
    vibration
):

    if (
        temperature >= 80
        or pressure >= 120
        or vibration == "High"
    ):
        return "High"

    if (
        temperature >= 65
        or pressure >= 100
        or vibration == "Medium"
    ):
        return "Medium"

    return "Low"


# ======================================================
# GENERATE DATA
# ======================================================

def generate_dataset(
    number_of_records=30000
):

    rng = np.random.default_rng(42)

    temperatures = rng.uniform(
        40,
        110,
        number_of_records
    )

    pressures = rng.uniform(
        60,
        150,
        number_of_records
    )

    vibration_values = rng.integers(
        0,
        3,
        number_of_records
    )

    vibration_names = [
        "Low",
        "Medium",
        "High"
    ]

    records = []

    for i in range(number_of_records):

        temperature = float(
            temperatures[i]
        )

        pressure = float(
            pressures[i]
        )

        vibration = vibration_names[
            vibration_values[i]
        ]

        risk = calculate_risk(
            temperature,
            pressure,
            vibration
        )

        records.append({
            "Temperature": temperature,
            "Pressure": pressure,
            "Vibration": vibration,
            "Risk": risk
        })

    return records


# ======================================================
# SAVE CSV
# ======================================================

def save_csv(records):

    with open(
        DATA_PATH,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "Temperature",
                "Pressure",
                "Vibration",
                "Risk"
            ]
        )

        writer.writeheader()

        writer.writerows(records)


# ======================================================
# PREPARE ML FEATURES
# ======================================================

def prepare_features(records):

    vibration_mapping = {
        "Low": 0,
        "Medium": 1,
        "High": 2
    }

    X = []
    y = []

    for record in records:

        X.append([
            record["Temperature"],
            record["Pressure"],
            vibration_mapping[
                record["Vibration"]
            ]
        ])

        y.append(
            record["Risk"]
        )

    return np.array(X), np.array(y)


# ======================================================
# TRAIN MODELS
# ======================================================

def main():

    print("=" * 60)
    print("DYNAMIC MACHINE RISK - MODEL TRAINING")
    print("=" * 60)

    # --------------------------------------------------
    # Generate 30,000 records
    # --------------------------------------------------

    print(
        "\nGenerating 30,000 synthetic records..."
    )

    records = generate_dataset(
        30000
    )

    save_csv(records)

    print(
        f"Dataset saved to: {DATA_PATH}"
    )

    print(
        f"Total records: {len(records)}"
    )

    # --------------------------------------------------
    # Risk distribution
    # --------------------------------------------------

    risk_counts = {
        "Low": 0,
        "Medium": 0,
        "High": 0
    }

    for record in records:

        risk_counts[
            record["Risk"]
        ] += 1

    print("\nRisk distribution:")

    print(
        f"Low:    {risk_counts['Low']}"
    )

    print(
        f"Medium: {risk_counts['Medium']}"
    )

    print(
        f"High:   {risk_counts['High']}"
    )

    # --------------------------------------------------
    # Prepare features
    # --------------------------------------------------

    X, y = prepare_features(
        records
    )

    # --------------------------------------------------
    # Train/Test split
    # --------------------------------------------------

    X_train, X_test, y_train, y_test = (
        train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y
        )
    )

    print("\nDataset split:")

    print(
        f"Training records: {len(X_train)}"
    )

    print(
        f"Testing records:  {len(X_test)}"
    )

    # --------------------------------------------------
    # Models
    # --------------------------------------------------

    models = {

        "Random Forest":
            RandomForestClassifier(
                n_estimators=150,
                random_state=42,
                n_jobs=-1
            ),

        "Decision Tree":
            DecisionTreeClassifier(
                random_state=42
            ),

        "Gradient Boosting":
            GradientBoostingClassifier(
                random_state=42
            ),

        "Extra Trees":
            ExtraTreesClassifier(
                n_estimators=150,
                random_state=42,
                n_jobs=-1
            ),

        "Logistic Regression":
            LogisticRegression(
                max_iter=1000,
                random_state=42
            )
    }

    # --------------------------------------------------
    # Train
    # --------------------------------------------------

    metrics = {}

    print("\n")
    print("=" * 60)
    print("TRAINING MODELS")
    print("=" * 60)

    for model_name, model in models.items():

        print(
            f"\nTraining: {model_name}"
        )

        model.fit(
            X_train,
            y_train
        )

        predictions = model.predict(
            X_test
        )

        accuracy = accuracy_score(
            y_test,
            predictions
        )

        filename = (
            model_name
            .lower()
            .replace(" ", "_")
            + ".pkl"
        )

        model_path = (
            MODEL_DIR / filename
        )

        joblib.dump(
            model,
            model_path
        )

        metrics[model_name] = {
            "accuracy": round(
                float(accuracy),
                6
            ),
            "model_file": filename
        }

        print(
            f"Accuracy: {accuracy:.2%}"
        )

        print(
            f"Saved: {model_path}"
        )

    # --------------------------------------------------
    # Save metrics
    # --------------------------------------------------

    metrics_path = (
        BASE_DIR / "model_metrics.json"
    )

    with open(
        metrics_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            metrics,
            file,
            indent=4
        )

    # --------------------------------------------------
    # Final summary
    # --------------------------------------------------

    print("\n")
    print("=" * 60)
    print("TRAINING COMPLETED")
    print("=" * 60)

    print(
        "\n30,000 synthetic records created."
    )

    print(
        "\nModel Performance:"
    )

    for model_name, result in metrics.items():

        print(
            f"{model_name:<25}"
            f"{result['accuracy']:.2%}"
        )

    print(
        f"\nDataset: {DATA_PATH}"
    )

    print(
        f"Models:  {MODEL_DIR}"
    )

    print(
        f"Metrics: {metrics_path}"
    )


if __name__ == "__main__":
    main()