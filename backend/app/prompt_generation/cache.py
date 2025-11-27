"""
Simple in-memory cache for prompt variants
"""
import hashlib
from typing import Optional, List, Dict

# In-memory cache
_cache: Dict[str, List[Dict]] = {}


class PromptCache:
    """Simple in-memory cache for prompt variants"""
    
    def __init__(self):
        self.cache = _cache
    
    def _hash_prompt(self, prompt: str) -> str:
        """Generate cache key from prompt"""
        normalized = prompt.lower().strip()
        return hashlib.md5(normalized.encode()).hexdigest()
    
    def get(self, prompt: str) -> Optional[List[Dict]]:
        """Retrieve cached variants"""
        key = self._hash_prompt(prompt)
        return self.cache.get(key)
    
    def set(self, prompt: str, variants: List[Dict]) -> None:
        """Cache variants"""
        key = self._hash_prompt(prompt)
        self.cache[key] = variants
    
    def size(self) -> int:
        """Get cache size"""
        return len(self.cache)


# Global cache instance
prompt_cache = PromptCache()
