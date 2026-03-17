from agent import run_agent
from insight import generate_insight
from visualizer import create_chart
from recommendation import generate_recommendation
from forecast import forecast_sales
from dashboard import show_dashboard


print("\n================================================")
print("        Welcome to E-Commerce AI Business Assistant")
print("================================================\n")

print("This AI assistant helps analyze e-commerce business data.\n")

print("You can ask questions like:")
print("• Which products generate highest revenue?")
print("• Which product sells the most?")
print("• Show product performance")
print("• Show sales insights")
print("• Show business summary\n")

print("The assistant will automatically:")
print("✓ Analyze data")
print("✓ Explain insights")
print("✓ Recommend business actions")
print("✓ Visualize performance")
print("✓ Predict revenue trends\n")

print("Type 'exit' anytime to stop the assistant.\n")


while True:

    question = input("🧠 Ask your business question: ")

    if question.lower() == "exit":
        print("\nSession ended. Thank you for using the AI Business Assistant.\n")
        break

    if "summary" in question.lower() or "dashboard" in question.lower() or "overview" in question.lower():

        show_dashboard()
        continue

    try:

        print("\n🔎 Analyzing business data...\n")

        result = run_agent(question)

        print("\n📊 Query Result:\n")
        print(result)

        insight = generate_insight(result, question)

        print("\n💡 AI Insight:\n")
        print(insight)

        recommendation = generate_recommendation(result)

        if recommendation:
            print("\n🚀 Business Recommendation:\n")
            print(recommendation)

        print("\n📈 Generating Visualization...\n")
        create_chart(result)

        print("\n🔮 Forecasting Sales Trend...\n")
        forecast_sales(result)

        print("\n--------------------------------------------------\n")

    except Exception as e:
        print("\n⚠ Error occurred:", e)