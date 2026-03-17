import sqlite3
import pandas as pd


def show_dashboard():

    conn = sqlite3.connect("ecommerce.db")

    revenue_query = """
    SELECT SUM(oi.quantity * oi.price) as total_revenue
    FROM order_items oi
    """

    top_product_query = """
    SELECT p.name,
           SUM(oi.quantity * oi.price) AS revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.product_id
    GROUP BY p.name
    ORDER BY revenue DESC
    LIMIT 1
    """

    lowest_product_query = """
    SELECT p.name,
           SUM(oi.quantity * oi.price) AS revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.product_id
    GROUP BY p.name
    ORDER BY revenue ASC
    LIMIT 1
    """

    orders_query = """
    SELECT COUNT(DISTINCT order_id) as total_orders
    FROM order_items
    """

    revenue = pd.read_sql_query(revenue_query, conn)
    top_product = pd.read_sql_query(top_product_query, conn)
    lowest_product = pd.read_sql_query(lowest_product_query, conn)
    orders = pd.read_sql_query(orders_query, conn)

    conn.close()

    total_revenue = revenue.iloc[0]["total_revenue"]
    total_orders = orders.iloc[0]["total_orders"]
    top_name = top_product.iloc[0]["name"]
    top_value = top_product.iloc[0]["revenue"]
    low_name = lowest_product.iloc[0]["name"]
    low_value = lowest_product.iloc[0]["revenue"]

    print("\n=================================")
    print("📊 BUSINESS KPI DASHBOARD")
    print("=================================")

    print(f"\n💰 Total Revenue: {total_revenue}")
    print(f"📦 Total Orders: {total_orders}")

    print("\n🏆 Top Performing Product")
    print(f"{top_name} ({top_value})")

    print("\n📉 Lowest Performing Product")
    print(f"{low_name} ({low_value})")

    print("\n💡 AI Insight")
    print(f"{top_name} dominates the sales performance.")

    print("\n🚀 Recommendation")
    print(f"Increase promotion and stock for {top_name}.")

    print("\n=================================\n")