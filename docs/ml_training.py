"""
ML Training endpoints for Smart-PMS.
Place this file in your FastAPI project and include the router in main.py:

    from ml_training import router as ml_router
    app.include_router(ml_router)

Requires: pip install fastapi scikit-learn pandas sqlalchemy pymysql joblib python-multipart
"""

import io
import os
import joblib
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, UploadFile, File, HTTPException
from sqlalchemy import create_engine, text

# ── Config ────────────────────────────────────────────────────────────────────
DB_URL      = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@127.0.0.1:3306/pms")
MODEL_PATH  = os.path.join(os.path.dirname(__file__), "models", "random_forest.pkl")
TARGET_COL  = "feasibility_label"

engine = create_engine(DB_URL, pool_pre_ping=True)
router = APIRouter(prefix="/ml", tags=["Machine Learning"])

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _log(source_type: str, status: str, row_count: int = None,
         target_column: str = None, error_message: str = None):
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO ml_model_logs
                (source_type, target_column, status, row_count, error_message, trained_at, created_at, updated_at)
            VALUES
                (:source_type, :target_column, :status, :row_count, :error_message, :trained_at, NOW(), NOW())
        """), {
            "source_type":   source_type,
            "target_column": target_column,
            "status":        status,
            "row_count":     row_count,
            "error_message": error_message,
            "trained_at":    datetime.utcnow() if status != "running" else None,
        })


def _train(df: pd.DataFrame, source_type: str):
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder

    try:
        if TARGET_COL not in df.columns:
            raise ValueError(f"Target column '{TARGET_COL}' not found in dataset.")

        df = df.dropna(subset=[TARGET_COL])
        y  = LabelEncoder().fit_transform(df[TARGET_COL].astype(str))
        X  = df.drop(columns=[TARGET_COL]).select_dtypes(include=["number"])

        if X.empty or len(X) < 10:
            raise ValueError("Not enough numeric rows to train.")

        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X, y)
        joblib.dump(model, MODEL_PATH)

        _log(source_type, "success", row_count=len(X), target_column=TARGET_COL)

    except Exception as exc:
        _log(source_type, "failed", target_column=TARGET_COL, error_message=str(exc))


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/train-sql")
async def train_sql(background_tasks: BackgroundTasks):
    """Pull employee_performance_snapshots and retrain in background."""
    _log("sql", "running", target_column=TARGET_COL)

    def job():
        with engine.connect() as conn:
            df = pd.read_sql("SELECT * FROM employee_performance_snapshots", conn)
        _train(df, "sql")

    background_tasks.add_task(job)
    return {"message": "SQL training started."}


@router.post("/train-csv")
async def train_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Accept a CSV upload and retrain in background."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=422, detail="Only .csv files are accepted.")

    contents = await file.read()
    _log("csv", "running", target_column=TARGET_COL)

    def job():
        df = pd.read_csv(io.BytesIO(contents))
        _train(df, "csv")

    background_tasks.add_task(job)
    return {"message": "CSV training started."}
