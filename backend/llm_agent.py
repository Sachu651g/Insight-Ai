"""
llm_agent.py — Comprehensive Smart Agent (No Ollama Required)
==============================================================
Handles 25+ natural language query patterns with rich SQL and explanations.
Automatically uses Ollama/llama3 if available for even better responses.
"""

import sqlite3
import pandas as pd
import os
import re
import numpy as np
from sklearn.linear_model import LinearRegression

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "ecommerce.db")

# ── Optional Ollama ───────────────────────────────────────────────────────────
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3"
OLLAMA_ON  = False   # Set True if Ollama is running

def _try_ollama(prompt):
    if not OLLAMA_ON:
        return None
    try:
        import requests
        r = requests.post(OLLAMA_URL,
                          json={"model": MODEL_NAME, "prompt": prompt, "stream": False},
                          timeout=45)
        data = r.json()
        return data.get("response", "").strip() or None
    except Exception:
        return None

# ── DB helper ─────────────────────────────────────────────────────────────────
def run_sql(sql):
    conn = sqlite3.connect(DB_PATH)
    df   = pd.read_sql_query(sql, conn)
    conn.close()
    return df

def _num(q, default=5):
    """Extract a limit number from the question text."""
    for word, n in [("twenty",20),("fifteen",15),("twelve",12),("ten",10),
                    ("nine",9),("eight",8),("seven",7),("six",6),
                    ("five",5),("four",4),("three",3),("two",2),("all",100)]:
        if word in q:
            return n
    nums = re.findall(r'\b(\d+)\b', q)
    for n in nums:
        if 1 <= int(n) <= 100:
            return int(n)
    return default

# ── Intent detection ──────────────────────────────────────────────────────────
def detect_intent(question):
    q = question.lower()
    if any(w in q for w in ["predict","forecast","future","next month","next day","next week","will sell"]):
        return "forecast"
    db_kw = ["revenue","sales","product","customer","order","profit","stock","inventory",
             "top","best","worst","most","least","highest","lowest","show","list","give",
             "which","how many","total","count","average","price","amount","expensive",
             "cheap","sell","sold","purchase","buy","bought","trend","daily","monthly",
             "popular","compare","performance","category","report","summary","overview",
             "restock","out of stock","low stock","spending","spent","earning","income"]
    if any(w in q for w in db_kw):
        return "database"
    return "general"

# ── SQL generator — 25+ patterns ─────────────────────────────────────────────
def generate_sql(question):
    q   = question.lower()
    lim = _num(q)

    # ── Revenue / earnings ────────────────────────────────────────────────────
    if any(w in q for w in ["revenue","earning","income","profit","top product","best product","highest revenue","most revenue"]):
        if "monthly" in q or "month" in q:
            return """
SELECT strftime('%Y-%m', o.order_date) AS month,
       ROUND(SUM(oi.quantity * oi.price), 2) AS monthly_revenue
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY month
ORDER BY month;"""
        if "daily" in q or "day" in q or "trend" in q or "over time" in q:
            return """
SELECT DATE(o.order_date) AS order_day,
       ROUND(SUM(oi.quantity * oi.price), 2) AS daily_revenue
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY order_day
ORDER BY order_day;"""
        if "customer" in q:
            return f"""
SELECT c.name AS customer,
       ROUND(SUM(oi.quantity * oi.price), 2) AS total_revenue
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY c.name
ORDER BY total_revenue DESC
LIMIT {lim};"""
        return f"""
SELECT p.name AS product,
       SUM(oi.quantity) AS units_sold,
       ROUND(SUM(oi.quantity * oi.price), 2) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
GROUP BY p.name
ORDER BY total_revenue DESC
LIMIT {lim};"""

    # ── Best/most selling products ────────────────────────────────────────────
    if any(w in q for w in ["sell","sold","units","quantity sold","most popular","best selling","sells the most","popular product"]):
        return f"""
SELECT p.name AS product,
       SUM(oi.quantity) AS units_sold,
       ROUND(SUM(oi.quantity * oi.price), 2) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
GROUP BY p.name
ORDER BY units_sold DESC
LIMIT {lim};"""

    # ── Customer spending / top customers ────────────────────────────────────
    if "customer" in q:
        if any(w in q for w in ["most","top","highest","best","spend","spent","value","lifetime"]):
            return f"""
SELECT c.name AS customer,
       c.email,
       COUNT(DISTINCT o.order_id) AS total_orders,
       ROUND(SUM(o.total_amount), 2) AS lifetime_value
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.name, c.email
ORDER BY lifetime_value DESC
LIMIT {lim};"""
        if "order" in q and any(w in q for w in ["most","frequent","placed"]):
            return f"""
SELECT c.name AS customer,
       COUNT(o.order_id) AS order_count,
       ROUND(SUM(o.total_amount), 2) AS total_spent
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.name
ORDER BY order_count DESC
LIMIT {lim};"""
        return f"""
SELECT c.customer_id, c.name, c.email,
       COUNT(o.order_id) AS total_orders,
       ROUND(COALESCE(SUM(o.total_amount),0), 2) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id
LIMIT {lim};"""

    # ── Inventory / stock ─────────────────────────────────────────────────────
    if any(w in q for w in ["inventory","stock","restock","low stock","out of stock","quantity left","available"]):
        if any(w in q for w in ["low","restock","less","critical","urgent","out"]):
            return """
SELECT p.name AS product,
       i.stock_quantity,
       CASE
         WHEN i.stock_quantity < 20 THEN 'CRITICAL - Restock Now'
         WHEN i.stock_quantity < 50 THEN 'Low Stock'
         ELSE 'Adequate'
       END AS status
FROM inventory i
JOIN products p ON i.product_id = p.product_id
ORDER BY i.stock_quantity ASC;"""
        return """
SELECT p.name AS product,
       p.price,
       i.stock_quantity,
       CASE
         WHEN i.stock_quantity < 20 THEN 'CRITICAL'
         WHEN i.stock_quantity < 50 THEN 'Low'
         ELSE 'OK'
       END AS stock_status
FROM inventory i
JOIN products p ON i.product_id = p.product_id
ORDER BY i.stock_quantity ASC;"""

    # ── Orders ────────────────────────────────────────────────────────────────
    if any(w in q for w in ["order","purchase","transaction","recent order","latest order"]):
        if any(w in q for w in ["recent","latest","last","new"]):
            return f"""
SELECT o.order_id,
       c.name AS customer,
       o.order_date,
       ROUND(o.total_amount, 2) AS amount,
       COUNT(oi.order_item_id) AS items
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id
ORDER BY o.order_date DESC
LIMIT {lim};"""
        if "total" in q or "summary" in q or "count" in q:
            return """
SELECT COUNT(DISTINCT o.order_id) AS total_orders,
       ROUND(SUM(o.total_amount), 2) AS total_revenue,
       ROUND(AVG(o.total_amount), 2) AS average_order_value,
       COUNT(DISTINCT o.customer_id) AS unique_customers
FROM orders o;"""
        return f"""
SELECT o.order_id,
       c.name AS customer,
       o.order_date,
       ROUND(o.total_amount, 2) AS amount
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
ORDER BY o.order_date DESC
LIMIT {lim};"""

    # ── Products catalog / price ──────────────────────────────────────────────
    if any(w in q for w in ["product","price","catalog","item","goods","expensive","cheap","cost"]):
        if any(w in q for w in ["expensive","highest price","most expensive","costly","premium"]):
            return f"""
SELECT p.name AS product,
       p.price,
       COALESCE(i.stock_quantity, 0) AS stock
FROM products p
LEFT JOIN inventory i ON p.product_id = i.product_id
ORDER BY p.price DESC
LIMIT {lim};"""
        if any(w in q for w in ["cheap","lowest price","affordable","budget"]):
            return f"""
SELECT p.name AS product, p.price,
       COALESCE(i.stock_quantity,0) AS stock
FROM products p
LEFT JOIN inventory i ON p.product_id = i.product_id
ORDER BY p.price ASC
LIMIT {lim};"""
        if "performance" in q or "compare" in q:
            return f"""
SELECT p.name AS product,
       p.price,
       COALESCE(SUM(oi.quantity),0) AS units_sold,
       ROUND(COALESCE(SUM(oi.quantity * oi.price),0), 2) AS total_revenue,
       COALESCE(i.stock_quantity,0) AS stock_remaining
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN inventory i ON p.product_id = i.product_id
GROUP BY p.product_id
ORDER BY total_revenue DESC
LIMIT {lim};"""
        return f"""
SELECT p.product_id, p.name AS product, p.price,
       COALESCE(i.stock_quantity,0) AS stock
FROM products p
LEFT JOIN inventory i ON p.product_id = i.product_id
ORDER BY p.price DESC
LIMIT {lim};"""

    # ── Sales trend / daily / monthly ─────────────────────────────────────────
    if any(w in q for w in ["trend","daily","monthly","over time","by date","by month","history","performance"]):
        if "month" in q:
            return """
SELECT strftime('%Y-%m', order_date) AS month,
       COUNT(order_id) AS orders,
       ROUND(SUM(total_amount), 2) AS revenue
FROM orders
GROUP BY month
ORDER BY month;"""
        return """
SELECT DATE(order_date) AS date,
       COUNT(order_id) AS orders,
       ROUND(SUM(total_amount), 2) AS revenue
FROM orders
GROUP BY date
ORDER BY date;"""

    # ── Overall summary / total / dashboard ───────────────────────────────────
    if any(w in q for w in ["total","overall","summary","overview","dashboard","kpi","metric","report"]):
        return """
SELECT
  (SELECT COUNT(*) FROM products) AS total_products,
  (SELECT COUNT(*) FROM customers) AS total_customers,
  (SELECT COUNT(*) FROM orders) AS total_orders,
  (SELECT ROUND(SUM(total_amount),2) FROM orders) AS total_revenue,
  (SELECT ROUND(AVG(total_amount),2) FROM orders) AS avg_order_value,
  (SELECT COUNT(*) FROM inventory WHERE stock_quantity < 20) AS critical_stock_items;"""

    # ── Average order value ───────────────────────────────────────────────────
    if any(w in q for w in ["average","avg","mean"]):
        return """
SELECT ROUND(AVG(total_amount), 2) AS average_order_value,
       MIN(total_amount) AS min_order,
       MAX(total_amount) AS max_order,
       COUNT(*) AS total_orders
FROM orders;"""

    # ── Default fallback — top products by revenue ────────────────────────────
    return f"""
SELECT p.name AS product,
       SUM(oi.quantity) AS units_sold,
       ROUND(SUM(oi.quantity * oi.price), 2) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
GROUP BY p.name
ORDER BY total_revenue DESC
LIMIT {lim};"""

# ── Rich explanation generator ────────────────────────────────────────────────
def explain_result(question, df):
    # Try Ollama first
    resp = _try_ollama(f"""You are Ace, an expert business analyst. Answer in 3-4 clear sentences.
User asked: {question}
Data: {df.head(5).to_string()}
Provide a clear business insight with numbers.""")
    if resp:
        return resp

    q    = question.lower()
    rows = len(df)
    cols = list(df.columns)

    if df.empty:
        return "No data found. The database may not have records matching your request. Try rephrasing your question."

    try:
        c0 = str(df.iloc[0, 0]) if len(cols) > 0 else ""
        v1 = df.iloc[0, 1] if len(cols) > 1 else None
        cl = str(df.iloc[-1, 0]) if rows > 1 else c0
        vl = df.iloc[-1, 1] if len(cols) > 1 and rows > 1 else v1

        if any(w in q for w in ["revenue","earning","profit","income"]):
            total = pd.to_numeric(df.iloc[:,1], errors='coerce').sum()
            pct   = round((float(v1)/total)*100, 1) if total > 0 and v1 else 0
            return (f"Your top revenue generator is {c0} with ₹{float(v1):,.2f} in total sales, "
                    f"representing {pct}% of the displayed revenue. "
                    f"{cl} ranks last with ₹{float(vl):,.2f}. "
                    f"Focus marketing investment on {c0} while reviewing pricing strategy for {cl}.")

        if any(w in q for w in ["sell","sold","units","popular"]):
            return (f"{c0} is your best-selling product with {int(float(v1)):,} units sold. "
                    f"This indicates strong market demand for this item. "
                    f"{cl} has the lowest sales at {int(float(vl)):,} units. "
                    f"Consider bundling slow sellers with top performers to boost overall volume.")

        if "customer" in q and any(w in q for w in ["spend","value","lifetime","top"]):
            return (f"Your highest-value customer is {c0} with ₹{float(v1):,.2f} in lifetime purchases. "
                    f"The query shows {rows} customers ranked by spending. "
                    f"Consider loyalty programs or exclusive offers for your top 3 customers. "
                    f"This group likely represents a significant portion of total revenue.")

        if any(w in q for w in ["stock","inventory","restock"]):
            low = df[df.iloc[:,1].apply(lambda x: pd.to_numeric(x, errors='coerce')).fillna(999) < 20] if len(cols) > 1 else pd.DataFrame()
            return (f"{c0} has the lowest stock at {v1} units and needs immediate attention. "
                    f"You have {len(low)} item(s) in critical stock levels (below 20 units). "
                    f"Set up automatic reorder points to prevent stockouts. "
                    f"Critical items can lead to lost sales and poor customer experience.")

        if any(w in q for w in ["trend","daily","monthly","over time"]):
            num_col = pd.to_numeric(df.iloc[:,1], errors='coerce').dropna()
            if len(num_col) > 1:
                trend = "increasing 📈" if num_col.iloc[-1] > num_col.iloc[0] else "decreasing 📉"
                avg   = num_col.mean()
                return (f"Your sales data shows a {trend} trend over {rows} time periods. "
                        f"Average revenue per period is ₹{avg:,.2f}. "
                        f"The most recent period recorded ₹{float(num_col.iloc[-1]):,.2f}. "
                        f"Use this trend to plan inventory and marketing campaigns.")

        if any(w in q for w in ["order","purchase","transaction"]):
            return (f"The query returned {rows} orders from your database. "
                    f"The most recent order is from {c0}. "
                    f"Analysing order patterns helps identify peak purchasing periods and customer behaviour.")

        if any(w in q for w in ["total","summary","overview","dashboard"]):
            return (f"Your business dashboard shows a comprehensive overview across {rows} key metrics. "
                    f"This gives you a bird's eye view of your ecommerce operation. "
                    f"Review each KPI regularly to track growth and identify areas needing attention.")

        return (f"Your query returned {rows} record{'s' if rows != 1 else ''} from the database. "
                f"The results show {', '.join(cols[:3])} data. "
                f"Use the Chart tab to visualise this data and the SQL tab to see the exact query used.")

    except Exception:
        return f"Query completed and returned {rows} rows from the ecommerce database."

# ── General chat ──────────────────────────────────────────────────────────────
def general_chat(question):
    resp = _try_ollama(f"You are Ace, an AI business analytics assistant. Answer helpfully in 3 sentences:\n{question}")
    if resp:
        return resp

    q = question.lower()
    if any(w in q for w in ["hello","hi","hey","good morning","good evening","good afternoon","howdy"]):
        return ("👋 Hello! I'm Ace, your AI business analytics assistant for InsightAgent AI. "
                "I can analyse your ecommerce data — products, customers, orders, revenue, inventory and forecasts. "
                "Try asking: 'Show top 5 products by revenue' or 'Which customers spend the most?'")
    if any(w in q for w in ["help","what can you do","capabilities","features","how to use"]):
        return ("I can answer questions about your ecommerce database in plain English. "
                "Ask about revenue, sales, customers, orders, inventory, trends or forecasts. "
                "For example: 'Show monthly revenue trend', 'Which products are low on stock?', or 'Who are my top customers?'")
    if any(w in q for w in ["who are you","what are you","your name","introduce"]):
        return ("I'm Ace — an intelligent AI business analyst built into InsightAgent AI. "
                "I translate your natural language questions into SQL queries, run them against your ecommerce database, "
                "and explain the results with business insights and recommendations.")
    if any(w in q for w in ["thank","thanks","great","awesome","good job","excellent","perfect","well done"]):
        return "You're welcome! Feel free to ask me anything else about your business data. I'm here to help! 🚀"
    if any(w in q for w in ["bye","goodbye","exit","quit","stop","close"]):
        return "Goodbye! Come back anytime you need business insights. Have a great day! 👋"
    return (f"I understand you're asking about '{question}'. "
            "I specialise in ecommerce data analysis. "
            "Try asking about products (revenue, sales), customers (spending, orders), "
            "inventory (stock levels), or trends (daily/monthly performance).")

# ── Sales forecast ────────────────────────────────────────────────────────────
def forecast_sales():
    try:
        df = run_sql("""
            SELECT DATE(order_date) AS date,
                   SUM(total_amount) AS revenue
            FROM orders
            GROUP BY date
            ORDER BY date
        """)
        if len(df) < 3:
            return df, "Not enough historical data (need at least 3 days) to make a reliable forecast."

        df["day_index"] = np.arange(len(df))
        X = df[["day_index"]]
        y = pd.to_numeric(df["revenue"], errors='coerce').fillna(0)

        model = LinearRegression()
        model.fit(X, y)
        prediction = model.predict([[len(df)]])[0]

        avg       = float(y.mean())
        peak      = float(y.max())
        trend_dir = "upward 📈" if model.coef_[0] > 0 else "downward 📉"
        r2        = round(model.score(X, y) * 100, 1)

        explanation = (
            f"Based on {len(df)} days of historical sales data, the predicted revenue for the next day "
            f"is approximately ₹{round(prediction, 2):,}. "
            f"The overall sales trend is {trend_dir} with an average daily revenue of ₹{round(avg, 2):,} "
            f"and a peak of ₹{round(peak, 2):,}. "
            f"This Linear Regression forecast has a model fit of {r2}% — "
            f"{'reliable' if r2 > 70 else 'use as a rough estimate'}."
        )
        return df, explanation
    except Exception as e:
        return pd.DataFrame(), f"Forecast error: {str(e)}"

# ── Main entry point ──────────────────────────────────────────────────────────
def ask_ai(question):
    """Returns (sql, dataframe, explanation)"""
    intent = detect_intent(question)

    if intent == "forecast":
        df, explanation = forecast_sales()
        return None, df, explanation

    if intent == "database":
        sql = generate_sql(question)
        try:
            df          = run_sql(sql)
            explanation = explain_result(question, df)
            return sql.strip(), df, explanation
        except Exception as e:
            # Fallback to safe query
            try:
                fallback = """SELECT p.name AS product, SUM(oi.quantity) AS units_sold,
                              ROUND(SUM(oi.quantity * oi.price),2) AS total_revenue
                              FROM order_items oi JOIN products p ON oi.product_id = p.product_id
                              GROUP BY p.name ORDER BY total_revenue DESC LIMIT 5;"""
                df          = run_sql(fallback)
                explanation = (f"I had trouble with your specific query ('{question}'). "
                               f"Here are the top products by revenue instead. "
                               f"Try rephrasing your question for more specific results.")
                return fallback.strip(), df, explanation
            except Exception:
                return None, None, (f"Sorry, I couldn't retrieve data for '{question}'. "
                                    "Please make sure the database is seeded by running 'python seed_db.py'.")

    answer = general_chat(question)
    return None, None, answer
