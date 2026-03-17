def generate_recommendation(df):

    if df is None or df.empty or df.shape[1] < 2:
        return ""

    try:

        # sort based on performance
        sorted_df = df.sort_values(by=df.columns[1], ascending=False)

        top_item = sorted_df.iloc[0,0]
        top_value = sorted_df.iloc[0,1]

        lowest_item = sorted_df.iloc[-1,0]
        lowest_value = sorted_df.iloc[-1,1]

        recommendation = f"""

AI Recommendation:

• {top_item} is generating the highest revenue ({top_value}).
  Consider increasing marketing and inventory for this product.

• {lowest_item} has the lowest performance ({lowest_value}).
  Consider discounts, promotions, or bundling strategies.

"""

        return recommendation

    except Exception:

        return ""