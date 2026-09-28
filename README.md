Dynamic Machine Data Management & Local Risk Prediction
GitHub Repository: https://github.com/D-Abhinay/Dynamic-Machine-Data-Management-Local-Risk-Prediction
A simple web application to manage machine information with user-configurable fields and to predict a machine’s risk level (Low / Medium / High) using a local Python Machine Learning model.
No cloud AI services or external AI APIs are used. Everything runs on your own machine.
________________________________________
Features
•	Dynamic field configuration: add, edit and delete machine fields (Text, Number, Dropdown) from the UI, with a required/optional flag and dropdown options.
•	Machine records: create, view, edit and delete machines. The entry form is generated from the configured fields.
•	Flexible storage: field definitions and machine data are stored so that new fields need no database schema change.
•	Local ML prediction: select a machine, choose a model, and get a risk level from a scikit-learn model.
•	Simple Web UI: field configuration, machine records and risk prediction in one page.
________________________________________
Technologies Used
Layer	Technology
Backend	Python, FastAPI, Uvicorn
Database	SQLite via SQLAlchemy
Validation	Pydantic
Frontend	HTML, CSS, vanilla JavaScript (served by FastAPI)
Machine Learning	Python, scikit-learn, NumPy, joblib
________________________________________
Project Structure
.
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, static frontend, health check
│   │   ├── database.py        # SQLite engine and session
│   │   ├── models.py          # MachineField and Machine tables
│   │   ├── schemas/           # Pydantic request/response models
│   │   └── routes/
│   │       ├── fields.py      # Field configuration API
│   │       ├── machines.py    # Machine CRUD API + validation
│   │       └── prediction.py  # Calls the Python ML component
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── ml/
│   ├── train_models.py        # Generates data and trains all models
│   ├── predict.py             # Command-line prediction script
│   ├── synthetic_machine_data.csv
│   ├── model_metrics.json     # Test accuracy of each model
│   └── models/                # Trained models (.pkl)
└── README.md
________________________________________
Setup and Run
Get the code
git clone https://github.com/D-Abhinay/Dynamic-Machine-Data-Management-Local-Risk-Prediction.git
cd Dynamic-Machine-Data-Management-Local-Risk-Prediction
Prerequisites
•	Python 3.10 or newer
•	pip
1. Create a virtual environment and install dependencies
Windows (PowerShell):
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
macOS / Linux:
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
2. Start the application
Run this from inside the backend folder (the SQLite file is created there):
uvicorn app.main:app --reload
3. Open the app
•	Web UI: http://127.0.0.1:8000
•	API docs (Swagger): http://127.0.0.1:8000/docs
•	Health check: http://127.0.0.1:8000/health
The database tables are created automatically on first start. The database starts empty, so create the initial fields first (see below).
4. Create the initial fields
In the Fields section of the UI, add these fields. The names for the ML inputs must match exactly (case-sensitive):
Field name	Type	Required	Options
Machine Name	Text	Yes	
Temperature	Number	Yes	
Pressure	Number	Yes	
Vibration	Dropdown	Yes	Low, Medium, High
Then go to Machines, create a record, and use Risk Prediction to run a prediction.
________________________________________
Starting the Python ML Component
The ML component does not need to be started separately. When you request a prediction, the backend launches ml/predict.py as a local Python process using the same interpreter as the backend, passes the machine’s values as arguments, and reads the JSON result from its output.
You can also run the ML component on its own:
python ml/predict.py --model random_forest --temperature 85 --pressure 120 --vibration High
Output:
{"model": "random_forest", "risk_level": "High"}
Available models: random_forest, decision_tree, gradient_boosting, extra_trees, logistic_regression.
Retraining the models (optional)
Trained models are included in ml/models/. To regenerate the synthetic dataset and retrain all models:
python ml/train_models.py
This writes ml/synthetic_machine_data.csv, the model files, and ml/model_metrics.json.
The .pkl files depend on the scikit-learn version they were trained with. If you see a version warning or error when loading a model, run the retraining command above.
________________________________________
Architecture
Web UI (HTML / JS)
        │  REST (JSON)
        ▼
FastAPI Backend
        │
        ├──► SQLite Database
        │      • machine_fields  (field configuration)
        │      • machines        (machine data as JSON)
        │
        └──► Python ML component  (ml/predict.py, run as a local process)
                 │
                 ▼
            Risk result (Low / Medium / High) ──► back to the Web UI
Prediction flow
1.	The user selects a machine and a model in the UI.
2.	The UI calls POST /prediction/{machine_id}?model_name=....
3.	The backend loads the machine’s data from the database.
4.	The backend checks that Temperature, Pressure and Vibration are present and valid.
5.	The backend runs ml/predict.py with those values.
6.	The script loads the selected model, predicts, and prints JSON.
7.	The backend returns the risk level, the model used and the inputs used to the UI.
API overview
Method	Endpoint	Purpose
GET / POST	/fields/	List / create fields
GET / PUT / DELETE	/fields/{id}	Read / update / delete a field
GET / POST	/machines/	List / create machines
GET / PUT / DELETE	/machines/{id}	Read / update / delete a machine
GET	/prediction/models/list	List available ML models
POST	/prediction/{machine_id}?model_name=	Run a risk prediction
GET	/health	Health check
________________________________________
How Dynamic Fields Work
Two tables are used:
•	machine_fields stores the configuration: field_name, field_type (text / number / dropdown), required, and dropdown_options (JSON list).
•	machines stores each record as a single JSON object in field_values, for example:
{"Machine Name": "Pump A", "Temperature": 85, "Pressure": 120, "Vibration": "High"}
Because values live in a JSON column keyed by field name, adding a field never requires an ALTER TABLE.
•	The frontend reads /fields/ and builds the machine form and table columns from that configuration, so nothing is hardcoded in the UI.
•	On create and update, the backend validates the submitted values against the current field configuration (required fields, number type, dropdown option membership, unknown fields rejected).
________________________________________
The Humidity Scenario
Suppose the model was built with Temperature, Pressure and Vibration, and the user later adds Humidity (Number).
How the application handles the new field
The user adds Humidity in the Fields section. It appears immediately in the machine form and table. Values are validated as numbers and stored in the machine’s JSON. No code change, no database migration and no restart are required. Machines created before the field existed simply have no Humidity value (make the field optional if you want to keep them valid).
Can the existing ML model use it?
No. The trained models were fitted on exactly three features (Temperature, Pressure, Vibration) in a fixed order. They cannot accept a fourth input, and their predictions are unchanged. The prediction endpoint reads only those three fields and ignores Humidity. The response includes a note saying that additional dynamic fields are stored but not used by the current models.
What is required for the model to use Humidity in the future
1.	Have training data that includes Humidity, either real historical records or an updated synthetic dataset, with risk labels that take Humidity into account.
2.	Update ml/train_models.py to include Humidity as a feature and retrain (or run a retraining step from stored machine data).
3.	Update ml/predict.py to accept Humidity and keep the feature order identical to training.
4.	Update the backend’s list of required ML fields in routes/prediction.py and pass the value through.
5.	Decide how to handle machines with a missing Humidity value (for example, a default or imputed value, or ask the user to fill it in).
6.	Replace the saved model files with the retrained ones.
A more scalable design would store the list of feature names alongside each trained model and map configured fields to model features by name, so future fields only need retraining rather than code changes.
________________________________________
Notes and Limitations
•	The ML data is synthetic. Risk labels come from simple rules on Temperature, Pressure and Vibration (for example, Vibration = High or Temperature ≥ 80 gives High risk). The near-perfect accuracy in model_metrics.json reflects that the models learn this rule, not real-world predictive power. The goal is to demonstrate the full flow from the application to the ML component and back.
•	ML input field names are fixed. Temperature, Pressure and Vibration must exist with exactly those names. Renaming or deleting them breaks prediction until they are restored.
•	Deleting a field does not remove old values from existing machine records. They stay in the stored JSON.
•	This is a demo application: no authentication, and SQLite is used for simplicity.
________________________________________
Security
No passwords, API keys or tokens are used or committed. The SQLite database file and .env files are excluded through .gitignore.
