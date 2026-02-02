
import asyncio
import os
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

async def test_anthropic():
    load_dotenv()
    api_key = os.getenv("ANTHROPIC_API_KEY")
    print(f"Testing Key: {api_key[:15]}... (len={len(api_key) if api_key else 0})")
    
    if not api_key:
        print("❌ No API key found")
        return

    client = AsyncAnthropic(api_key=api_key)
    
    models_to_test = [
        "claude-3-5-sonnet-20240620",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307"
    ]

    for model in models_to_test:
        print(f"\n--- Testing {model} ---")
        try:
            message = await client.messages.create(
                model=model,
                max_tokens=10,
                messages=[
                    {"role": "user", "content": "Hello"}
                ]
            )
            print(f"✅ Success! Response: {message.content[0].text}")
            return  # Stop after first success
        except Exception as e:
            print(f"❌ Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_anthropic())
