from database import execute_query, get_schema
import plotly.express as px
import pandas as pd


def tool_get_schema():
    """
    Returns database schema
    """
    schema = get_schema()
    return schema


def tool_execute_query(sql):
    """
    Executes SQL query on database
    """
    result = execute_query(sql)
    return result


def tool_generate_chart(df, chart_type="bar"):
    """
    Generate charts from dataframe
    """

    if chart_type == "bar":
        fig = px.bar(df, x=df.columns[0], y=df.columns[1])

    elif chart_type == "line":
        fig = px.line(df, x=df.columns[0], y=df.columns[1])

    elif chart_type == "pie":
        fig = px.pie(df, names=df.columns[0], values=df.columns[1])

    elif chart_type == "scatter":
        fig = px.scatter(df, x=df.columns[0], y=df.columns[1])

    else:
        return "Unsupported chart type"

    return fig


def tool_generate_flowchart():
    """
    Generate ER diagram flowchart
    """

    mermaid = """
    graph TD
        Customers --> Orders
        Products --> Orders
        Products --> Inventory
    """

    return mermaid


def tool_explain_data(df):
    """
    Generate simple insights from dataframe
    """

    summary = f"""
    The dataset contains {len(df)} rows.

    Highest value:
    {df.iloc[0].to_dict()}

    Lowest value:
    {df.iloc[-1].to_dict()}
    """

    return summary