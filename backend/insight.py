def generate_insight(df, question):

    if df.empty:
        return "No data available to generate insights."

    q = question.lower()

    if "revenue" in q:
        top_product = df.iloc[0, 0]
        revenue = df.iloc[0, 1]

        return f"The product generating the highest revenue is {top_product} with total revenue of {revenue}. This indicates it is the best performing product."

    if "inventory" in q or "stock" in q:
        lowest = df.iloc[0, 0]

        return f"{lowest} has the lowest stock and may require restocking soon."

    if "customers" in q:
        return f"The dataset contains {len(df)} customers displayed."

    return "The query successfully returned business data insights."