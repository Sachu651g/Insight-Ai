import sqlite3
import pandas as pd
import os
import numpy as np
from sklearn.linear_model import LinearRegression

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "ecommerce.db")


def predict_sales():

    conn = sqlite3.connect(DB_PATH)

    df = pd.read_sql_query(
        """
        SELECT order_date, SUM(total_amount) AS revenue
        FROM orders
        GROUP BY order_date
        ORDER BY order_date
        """,
        conn
    )

    conn.close()

    if len(df) < 2:
        return df, "Not enough data for prediction"

    df["day_index"] = np.arange(len(df))

    X = df[["day_index"]]
    y = df["revenue"]

    model = LinearRegression()
    model.fit(X, y)

    future = [[len(df)]]

    prediction = model.predict(future)[0]

    explanation = f"""
Future Prediction:

Based on historical sales trends, the predicted revenue for the next day is approximately {round(prediction,2)}.

This prediction is generated using a Linear Regression forecasting model.
"""

    return df, explanation