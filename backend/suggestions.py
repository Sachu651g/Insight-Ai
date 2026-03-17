def suggest_questions(question):

    q = question.lower()

    if "revenue" in q:
        return [
            "Which product sells the most?",
            "Show product performance",
            "Which products need restocking?"
        ]

    elif "sell" in q:
        return [
            "Which product generates highest revenue?",
            "Show inventory status",
            "Which customers buy the most?"
        ]

    elif "inventory" in q or "stock" in q:
        return [
            "Which products generate highest revenue?",
            "Which product sells the most?",
            "Show product performance"
        ]

    else:
        return [
            "Which products generate highest revenue?",
            "Which product sells the most?",
            "Show product performance"
        ]