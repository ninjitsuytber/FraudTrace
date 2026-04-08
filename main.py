from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import prompt
import uvicorn
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = "[ENCRYPTION_KEY]"

@app.post("/api/save-key")
async def save_key(request: Request):
    data = await request.json()
    key = data.get("apiKey")
    if not key:
        return {"error": "API Key is missing."}

    try:
        test_client = genai.Client(api_key=key)
        # Standard model for testing key validity
        test_client.models.generate_content(
            model="gemini-2.5-flash",
            contents="test"
        )
    except Exception as e:
        error_msg = str(e).lower()
        if "403" in error_msg or "invalid" in error_msg:
            return {"error": "Invalid API Key. Please check your credentials.", "details": str(e)}
        if "429" in error_msg or "quota" in error_msg:
            return {"error": "API Quota exceeded or rate limited.", "details": str(e)}
        return {"error": "Connection stability issue during validation.", "details": str(e)}
    
    with open(__file__, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = re.sub(r'^API_KEY\s*=\s*".*?"', f'API_KEY = "{key}"', content, flags=re.MULTILINE)
    
    with open(__file__, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    global API_KEY
    API_KEY = key
    
    return {"status": "success"}

@app.post("/api/chat")
async def chat(request: Request):
    data = await request.json()
    user_input = data.get("message")
    
    client = genai.Client(api_key=API_KEY)
    
    system_prompt = prompt.prompt()
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_prompt}\n\nUser Input: {user_input}"
        )
        return {"response": response.text}
    except Exception as e:
        error_msg = str(e).lower()
        if any(keyword in error_msg for keyword in ["429", "quota", "exhausted", "invalid", "403", "permission"]):
            return {"error": "API_EXHAUSTED", "details": str(e)}
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
