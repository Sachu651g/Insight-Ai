"""
InsightAgent AI — FastAPI Backend
==================================
Endpoints consumed by the React frontend:

  POST /ask              — Main LLM query → SQL → data → chart → insight
  GET  /schema           — Database schema (tables + columns)
  GET  /er-diagram       — Mermaid ER diagram definition string
  GET  /suggestions      — Starter question suggestions
  GET  /health           — Liveness probe
"""

import sqlite3
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from llm_agent import ask_ai
from visualizer import create_chart
from recommendation import generate_recommendation
from suggestions import suggest_questions

# ── App setup ──────────────────────────────────────────────────────────────────

app = FastAPI(title="InsightAgent AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # React dev server on any port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated chart images so the frontend can display them
app.mount("/charts", StaticFiles(directory="."), name="charts")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "ecommerce.db")

# ── Pydantic models ────────────────────────────────────────────────────────────

class Query(BaseModel):
    query: str

# ── /health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Liveness probe used by the frontend status badge."""
    return {"status": "ok"}

# ── /ask ──────────────────────────────────────────────────────────────────────

@app.post("/ask")
def ask(query: Query):
    """
    Main agent endpoint.

    Request:  { "query": "Show top 5 products by revenue" }

    Response:
    {
      "question":       string,        # echoed user question
      "sql":            string | null,
      "data":           list | null,   # array of row objects
      "chart":          string | null, # URL path to chart image  e.g. "/charts/chart.png"
      "chart_type":     string,        # hint for frontend  "bar" | "line" | "pie"
      "explanation":    string,
      "insight":        string,
      "recommendation": string,
      "suggestions":    string[]
    }
    """
    question = query.query.strip()

    # Call the LLM agent  →  (sql, dataframe, explanation)
    sql, df, explanation = ask_ai(question)

    chart            = None
    chart_type       = "bar"
    recommendation   = ""
    insight          = ""
    data             = None

    if df is not None and not df.empty:
        data = df.to_dict(orient="records")

        # Generate matplotlib chart → saved as chart.png → served at /charts/chart.png
        chart_path = create_chart(df)
        if chart_path:
            chart = f"/charts/{chart_path}"

        # Detect chart type hint from column names / data shape
        chart_type = _detect_chart_type(df)

        # Rule-based recommendation from top/bottom rows
        recommendation = generate_recommendation(df) or ""

        # Simple rule-based insight from the dataframe
        insight = _generate_insight(df, question)

    # Context-aware follow-up suggestions
    suggestions = suggest_questions(question)

    return {
        "question":       question,
        "sql":            sql,
        "data":           data,
        "chart":          chart,
        "chart_type":     chart_type,
        "explanation":    explanation or "",
        "insight":        insight,
        "recommendation": recommendation,
        "suggestions":    suggestions,
    }

# ── /schema ───────────────────────────────────────────────────────────────────

@app.get("/schema")
def get_schema():
    """
    Returns the live database schema.

    Response:
    {
      "database": "ecommerce.db",
      "dialect":  "SQLite",
      "tables": [
        {
          "name": "products",
          "columns": [
            { "name": "product_id", "type": "INTEGER", "nullable": false },
            ...
          ],
          "primaryKeys": ["product_id"],
          "foreignKeys": []
        },
        ...
      ]
    }
    """
    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all user tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    table_names = [row[0] for row in cursor.fetchall()]

    tables = []
    for table_name in table_names:
        cursor.execute(f"PRAGMA table_info({table_name})")
        cols_raw = cursor.fetchall()
        # PRAGMA columns: cid, name, type, notnull, dflt_value, pk
        columns = [
            {
                "name":     col[1],
                "type":     col[2] or "TEXT",
                "nullable": col[3] == 0,  # notnull=1 means NOT nullable
            }
            for col in cols_raw
        ]
        primary_keys = [col[1] for col in cols_raw if col[5] > 0]

        cursor.execute(f"PRAGMA foreign_key_list({table_name})")
        fk_raw = cursor.fetchall()
        # PRAGMA columns: id, seq, table, from, to, on_update, on_delete, match
        foreign_keys = [
            {
                "column":     fk[3],
                "references": f"{fk[2]}.{fk[4]}",
            }
            for fk in fk_raw
        ]

        tables.append({
            "name":        table_name,
            "columns":     columns,
            "primaryKeys": primary_keys,
            "foreignKeys": foreign_keys,
        })

    conn.close()

    return {
        "database": "ecommerce.db",
        "dialect":  "SQLite",
        "tables":   tables,
    }

# ── /er-diagram ───────────────────────────────────────────────────────────────

@app.get("/er-diagram")
def get_er_diagram():
    """
    Returns a Mermaid ER diagram definition for the ecommerce database.

    Response: { "diagram": "erDiagram\\n  ...", "title": "Ecommerce DB" }
    """
    diagram = """erDiagram
    PRODUCTS {
        int product_id PK
        string name
        float price
    }
    CUSTOMERS {
        int customer_id PK
        string name
        string email
    }
    ORDERS {
        int order_id PK
        int customer_id FK
        string order_date
        float total_amount
    }
    ORDER_ITEMS {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        float price
    }
    INVENTORY {
        int inventory_id PK
        int product_id FK
        int stock_quantity
    }

    CUSTOMERS ||--o{ ORDERS : "places"
    ORDERS    ||--|{ ORDER_ITEMS : "contains"
    PRODUCTS  ||--o{ ORDER_ITEMS : "included in"
    PRODUCTS  ||--|| INVENTORY  : "tracked in"
"""

    return {"diagram": diagram, "title": "Ecommerce Database"}

# ── /suggestions ──────────────────────────────────────────────────────────────

@app.get("/suggestions")
def get_suggestions():
    """
    Returns a list of starter questions for the frontend empty state.
    """
    return {
        "suggestions": [
            "Which products generate the highest revenue?",
            "Which product sells the most?",
            "Show inventory status for all products",
            "Which customers have placed the most orders?",
            "Show daily sales trend for this month",
            "Predict next day revenue",
        ]
    }

# ── Helpers ───────────────────────────────────────────────────────────────────

def _detect_chart_type(df) -> str:
    """
    Heuristic: inspect column names to pick the most appropriate chart type.
    The frontend uses this to set the Plotly trace type.
    """
    if df is None or df.empty:
        return "bar"

    cols = [c.lower() for c in df.columns]

    # Time series → line
    if any(kw in c for c in cols for kw in ("date", "day", "month", "year", "time")):
        return "line"

    # Single numeric column → histogram
    if len(df.columns) == 1:
        return "bar"

    # Revenue/price/amount columns with few rows → pie
    if len(df) <= 7 and any(kw in c for c in cols for kw in ("revenue", "amount", "total")):
        return "pie"

    return "bar"


def _generate_insight(df, question: str) -> str:
    """
    Rule-based insight generator that supplements the LLM explanation.
    """
    if df is None or df.empty:
        return ""

    q = question.lower()

    try:
        if len(df.columns) >= 2:
            top_label  = str(df.iloc[0, 0])
            top_value  = df.iloc[0, 1]
            bottom_label = str(df.iloc[-1, 0])
            bottom_value = df.iloc[-1, 1]

            if "revenue" in q or "product" in q:
                return (
                    f"{top_label} is the top performer with a value of {top_value}. "
                    f"{bottom_label} is at the bottom with {bottom_value}."
                )
            if "inventory" in q or "stock" in q:
                return (
                    f"{bottom_label} has the lowest stock ({bottom_value} units) "
                    f"and may need restocking soon."
                )
            if "customer" in q:
                return f"The dataset shows {len(df)} customers. Top customer: {top_label}."

        return f"Query returned {len(df)} rows of data."

    except Exception:
        return f"Query returned {len(df)} rows of data."
