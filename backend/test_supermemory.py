import httpx
import asyncio

async def test_supermemory():
    """Test Supermemory API directly to verify connectivity"""
    api_key = "YOUR_SUPERMEMORY_API_KEY"
    
    print("Testing Supermemory API...")
    print(f"API Key: {api_key[:20]}...")
    
    # Sanitize the tag
    user_email = "test@example.com"
    sanitized_tag = user_email.replace("@", "_at_").replace(".", "_dot_")
    print(f"Sanitized tag: {user_email} -> {sanitized_tag}")
    
    async with httpx.AsyncClient() as client:
        # Test adding a memory
        print("\n1. Testing POST /v3/documents with sanitized containerTag")
        response = await client.post(
            "https://api.supermemory.ai/v3/documents",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "content": "Test memory from AI Governance backend - SANITIZED TAG TEST",
                "containerTag": sanitized_tag,
                "metadata": {"source": "test_script"}
            }
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Successfully created memory!")
        
        # Test searching
        print("\n2. Testing POST /v3/search with sanitized containerTag")
        search_response = await client.post(
            "https://api.supermemory.ai/v3/search",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "q": "test memory",
                "containerTag": sanitized_tag,
                "limit": 5
            }
        )
        print(f"Status: {search_response.status_code}")
        print(f"Response: {search_response.text}")

if __name__ == "__main__":
    asyncio.run(test_supermemory())
