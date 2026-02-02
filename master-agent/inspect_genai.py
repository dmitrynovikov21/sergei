
import os
from google import genai
from dotenv import load_dotenv

load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)

print("Client Operations attributes:")
print(dir(client.operations))

print("\nHelp on get:")
try:
    help(client.operations.get)
except:
    print("No help available")

# Also try to generate a quick dummy operation to test if possible, but Veo is LRO.
