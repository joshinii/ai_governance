"""
Supermemory Knowledge Graph Service
Handles interaction with Supermemory API for storing and retrieving context.
"""
import httpx
from typing import List, Dict, Optional
from .config import settings

class KnowledgeGraphService:
    def __init__(self):
        self.api_key = settings.SUPERMEMORY_API_KEY
        self.base_url = settings.SUPERMEMORY_API_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def add_memory(self, content: str, user_id: str = None, metadata: Dict = None) -> bool:
        """
        Add a new memory (document) to the knowledge graph.
        Uses POST /v3/documents
        """
        if not content:
            print("DEBUG: add_memory called with empty content")
            return False
            
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "content": content,
                    "metadata": metadata or {}
                }
                
                # Add container tag for user segregation if user_id provided
                # Supermemory requires alphanumeric, hyphens, and underscores only
                if user_id:
                    # Sanitize email: replace @ with _at_ and . with _dot_
                    sanitized_tag = user_id.replace("@", "_at_").replace(".", "_dot_")
                    # Remove any other special characters
                    sanitized_tag = ''.join(c if c.isalnum() or c in '-_' else '_' for c in sanitized_tag)
                    payload["containerTag"] = sanitized_tag
                    print(f"DEBUG: Sanitized containerTag: {user_id} -> {sanitized_tag}")
                
                print(f"DEBUG: ===== SUPERMEMORY ADD MEMORY =====")
                print(f"DEBUG: Content length: {len(content)} chars")
                print(f"DEBUG: Content preview: {content[:100]}...")
                print(f"DEBUG: User (containerTag): {user_id}")
                print(f"DEBUG: Metadata: {metadata}")
                print(f"DEBUG: Full payload: {payload}")
                print(f"DEBUG: API URL: {self.base_url}/v3/documents")
                
                response = await client.post(
                    f"{self.base_url}/v3/documents",
                    headers=self.headers,
                    json=payload,
                    timeout=30.0
                )
                
                print(f"DEBUG: Response status: {response.status_code}")
                print(f"DEBUG: Response headers: {dict(response.headers)}")
                print(f"DEBUG: Response body: {response.text}")
                
                if response.is_success:
                    print(f"DEBUG: ✅ Successfully stored memory!")
                    return True
                else:
                    print(f"DEBUG: ❌ Failed to store memory.")
                    print(f"DEBUG: Status code: {response.status_code}")
                    print(f"DEBUG: Error response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"DEBUG: ❌ Exception in add_memory: {type(e).__name__}: {e}")
            import traceback
            print("DEBUG: Full traceback:")
            traceback.print_exc()
            return False

    async def search_memory(self, query: str, user_id: str = None, limit: int = 5) -> List[str]:
        """
        Search for relevant context in the knowledge graph.
        Uses POST /v3/search
        """
        if not query:
            return []
            
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "q": query,
                    "limit": limit
                }
                
                # Filter by user container tag if provided
                # Supermemory requires alphanumeric, hyphens, and underscores only
                if user_id:
                    sanitized_tag = user_id.replace("@", "_at_").replace(".", "_dot_")
                    sanitized_tag = ''.join(c if c.isalnum() or c in '-_' else '_' for c in sanitized_tag)
                    payload["containerTag"] = sanitized_tag
                
                response = await client.post(
                    f"{self.base_url}/v3/search",
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                
                print(f"DEBUG: Supermemory Search Response: {data}")
                
                # Extract memory content from results
                # Assuming 'results' list contains strings or dicts with content
                results = data.get("results", [])
                memories = []
                for item in results:
                    if isinstance(item, str):
                        memories.append(item)
                    elif isinstance(item, dict):
                        # Try common fields
                        content = item.get("content") or item.get("memory") or item.get("text")
                        if content:
                            memories.append(content)
                        else:
                            # Fallback to string representation
                            memories.append(str(item))
                
                return memories
                
        except Exception as e:
            print(f"DEBUG: Error searching Supermemory: {e}")
            if hasattr(e, 'response'):
                print(f"DEBUG: Supermemory Response: {e.response.text}")
            return []

# Global instance
kg_service = KnowledgeGraphService()
