from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import uvicorn

app = FastAPI(title="Gemma LLM Service")

class Message(BaseModel):
    role: str
    content: str

class CompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: Optional[float] = 0.7
    response_format: Optional[Dict] = None

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/v1/chat/completions")
async def chat_completions(request: CompletionRequest):
    """
    Mock LLM response for demonstration purposes.
    In a real deployment with GPU, this would call vLLM or HuggingFace pipeline.
    """
    print(f"Received request for model: {request.model}")
    
    # Extract the user prompt
    user_prompt = next((m.content for m in request.messages if m.role == "user"), "")
    
    # Mock logic to generate variants (simulating Gemma 3)
    # In production, replace this with actual model inference
    
    import json
    
    # Simulate "smart" generation based on input
    variants = [
        {
            "text": f"Context: [Insert Context Here]\n\n{user_prompt}\n\nPlease ensure the response is concise and avoids PII.",
            "improvements": ["Added context placeholder", "Added PII warning"],
            "score": 85
        },
        {
            "text": f"Task: Analyze the following request.\nInput: {user_prompt}\n\nOutput Format: JSON.",
            "improvements": ["Structured as Task/Input/Output", "Specified JSON format"],
            "score": 90
        },
        {
            "text": f"Role: Expert Assistant.\n\n{user_prompt}\n\nConstraint: Do not use personal data.",
            "improvements": ["Defined role", "Added negative constraint"],
            "score": 88
        }
    ]
    
    response_content = json.dumps({"variants": variants})
    
    return {
        "id": "chatcmpl-mock",
        "object": "chat.completion",
        "created": 1677652288,
        "model": request.model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_content
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": len(user_prompt),
            "completion_tokens": len(response_content),
            "total_tokens": len(user_prompt) + len(response_content)
        }
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
