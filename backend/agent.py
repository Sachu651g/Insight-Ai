from database import execute_query


def generate_sql(question):
    q = question.lower()

    # TOP PRODUCTS BY REVENUE
    if "revenue" in q or "top product" in q:
        return """
        SELECT p.name,
               SUM(oi.quantity * oi.price) AS total_revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        GROUP BY p.name
        ORDER BY total_revenue DESC
        LIMIT 5;
        """

    # LIST CUSTOMERS
    if "customers" in q:
        return """
        SELECT customer_id, name, email
        FROM customers
        LIMIT 10;
        """

    # SHOW PRODUCTS
    if "products" in q:
        return """
        SELECT product_id, name, price
        FROM products
        LIMIT 10;
        """

    # INVENTORY STATUS
    if "inventory" in q or "stock" in q:
        return """
        SELECT p.name, i.stock_quantity
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        ORDER BY i.stock_quantity ASC;
        """

    # SALES TREND
    if "sales" in q or "trend" in q:
        return """
        SELECT DATE(order_date) AS order_day,
               SUM(total_amount) AS revenue
        FROM orders
        GROUP BY order_day
        ORDER BY order_day;
        """

    # DEFAULT QUERY
    return """
    SELECT name, price
    FROM products
    LIMIT 5;
    """


def run_agent(question):
    sql = generate_sql(question)

    print("\nGenerated SQL:\n")
    print(sql)

    result = execute_query(sql)

    return result