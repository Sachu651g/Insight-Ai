"""
seed_db.py — Populate the ecommerce database with rich realistic data
Run once: python seed_db.py
"""
import sqlite3
import os
import random
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "ecommerce.db")

def seed():
    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ── Clear existing data ────────────────────────────────────────────────────
    cursor.execute("DELETE FROM order_items")
    cursor.execute("DELETE FROM inventory")
    cursor.execute("DELETE FROM orders")
    cursor.execute("DELETE FROM customers")
    cursor.execute("DELETE FROM products")

    # ── Products (20 items) ────────────────────────────────────────────────────
    products = [
        (1,  "Laptop Pro 15",       1299.99),
        (2,  "Smartphone X12",       899.99),
        (3,  "Wireless Headphones",  149.99),
        (4,  "Mechanical Keyboard",   89.99),
        (5,  "Gaming Mouse",          59.99),
        (6,  "4K Monitor",           449.99),
        (7,  "USB-C Hub",             39.99),
        (8,  "Webcam HD",             79.99),
        (9,  "External SSD 1TB",     109.99),
        (10, "Smart Watch",          299.99),
        (11, "Tablet 10 inch",       399.99),
        (12, "Bluetooth Speaker",     99.99),
        (13, "Laptop Stand",          49.99),
        (14, "Cable Management Kit",  19.99),
        (15, "LED Desk Lamp",         34.99),
        (16, "Noise Cancel Earbuds", 199.99),
        (17, "Graphics Card RTX",    699.99),
        (18, "RAM 16GB DDR5",        129.99),
        (19, "NVMe SSD 2TB",         189.99),
        (20, "Power Bank 20000mAh",   49.99),
    ]
    cursor.executemany("INSERT INTO products VALUES (?,?,?)", products)

    # ── Customers (15 people) ─────────────────────────────────────────────────
    customers = [
        (1,  "Alice Johnson",    "alice@email.com"),
        (2,  "Bob Smith",        "bob@email.com"),
        (3,  "Charlie Brown",    "charlie@email.com"),
        (4,  "Diana Prince",     "diana@email.com"),
        (5,  "Ethan Hunt",       "ethan@email.com"),
        (6,  "Fiona Green",      "fiona@email.com"),
        (7,  "George Miller",    "george@email.com"),
        (8,  "Hannah White",     "hannah@email.com"),
        (9,  "Ivan Drago",       "ivan@email.com"),
        (10, "Julia Roberts",    "julia@email.com"),
        (11, "Kevin Hart",       "kevin@email.com"),
        (12, "Lisa Simpson",     "lisa@email.com"),
        (13, "Mike Tyson",       "mike@email.com"),
        (14, "Nina Patel",       "nina@email.com"),
        (15, "Oscar Wilde",      "oscar@email.com"),
    ]
    cursor.executemany("INSERT INTO customers VALUES (?,?,?)", customers)

    # ── Orders (60 orders across 90 days) ─────────────────────────────────────
    random.seed(42)
    start_date = datetime(2024, 1, 1)
    order_id   = 1
    item_id    = 1
    all_orders = []
    all_items  = []

    for day in range(90):
        date     = start_date + timedelta(days=day)
        date_str = date.strftime("%Y-%m-%d")
        # 0-2 orders per day
        n_orders = random.choices([0, 1, 2, 3], weights=[20, 40, 30, 10])[0]

        for _ in range(n_orders):
            customer_id = random.randint(1, 15)
            # 1-4 items per order
            n_items     = random.randint(1, 4)
            order_total = 0.0
            chosen_products = random.sample(products, min(n_items, len(products)))

            for prod in chosen_products:
                qty   = random.randint(1, 3)
                price = prod[2]
                all_items.append((item_id, order_id, prod[0], qty, price))
                order_total += qty * price
                item_id     += 1

            all_orders.append((order_id, customer_id, date_str, round(order_total, 2)))
            order_id += 1

    cursor.executemany("INSERT INTO orders VALUES (?,?,?,?)", all_orders)
    cursor.executemany("INSERT INTO order_items VALUES (?,?,?,?,?)", all_items)

    # ── Inventory (realistic stock levels) ────────────────────────────────────
    inventory = [
        (1,  1,  45),   # Laptop Pro        — medium stock
        (2,  2,  80),   # Smartphone        — high stock
        (3,  3, 120),   # Headphones        — high stock
        (4,  4,  95),   # Keyboard          — high stock
        (5,  5, 200),   # Gaming Mouse      — very high
        (6,  6,  30),   # 4K Monitor        — low
        (7,  7, 250),   # USB-C Hub         — very high
        (8,  8,  60),   # Webcam            — medium
        (9,  9,  75),   # External SSD      — medium
        (10, 10, 50),   # Smart Watch       — medium
        (11, 11, 40),   # Tablet            — medium
        (12, 12,110),   # Bluetooth Speaker — high
        (13, 13,180),   # Laptop Stand      — high
        (14, 14,300),   # Cable Kit         — very high
        (15, 15,220),   # Desk Lamp         — very high
        (16, 16, 55),   # Earbuds           — medium
        (17, 17,  8),   # Graphics Card     — very low ⚠
        (18, 18, 90),   # RAM               — high
        (19, 19, 35),   # NVMe SSD          — low
        (20, 20,140),   # Power Bank        — high
    ]
    cursor.executemany("INSERT INTO inventory VALUES (?,?,?)", inventory)

    conn.commit()
    conn.close()

    print(f"✅ Database seeded successfully!")
    print(f"   Products  : {len(products)}")
    print(f"   Customers : {len(customers)}")
    print(f"   Orders    : {len(all_orders)}")
    print(f"   Order items: {len(all_items)}")

if __name__ == "__main__":
    seed()
