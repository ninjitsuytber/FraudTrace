from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import prompt
import uvicorn
import re
import os
from fastapi.responses import FileResponse, Response
from export_pdf import export_to_pdf, generate_pdf_bytes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = "AIzaSyC2NDBfCeApsYfV-QhD8Mu-N_-8ynUhDFE"

@app.post("/api/save-key")
async def save_key(request: Request):
    data = await request.json()
    key = data.get("apiKey")
    if not key:
        return {"error": "API Key is missing."}

    test_client = genai.Client(api_key=key, http_options={'timeout': 120})
    max_retries = 3
    
    import time
    for attempt in range(max_retries):
        try:
            test_client.models.generate_content(
                model="gemini-2.5-flash",
                contents="test"
            )
            break
        except Exception as e:
            error_msg = str(e).lower()
            if "403" in error_msg or "invalid" in error_msg:
                return {"error": "Invalid API Key. Please check your credentials.", "details": str(e)}
            if "429" in error_msg or "quota" in error_msg:
                return {"error": "API Quota exceeded or rate limited.", "details": str(e)}
            
            if attempt == max_retries - 1:
                return {"error": f"Connection stability issue after {max_retries} attempts.", "details": str(e)}
            
            time.sleep(1.5 * (attempt + 1))
    
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
    
    client = genai.Client(api_key=API_KEY, http_options={'timeout': 120})
    
    system_prompt = prompt.prompt()
    
    import time
    max_retries = 1
    for attempt in range(max_retries + 1):
        try:
            print(f"[NEURAL_LINK] Attempt {attempt + 1}: Contacting Gemini (timeout=120s)...")
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{system_prompt}\n\nUser Input: {user_input}"
            )
            print(f"[NEURAL_LINK] Success on attempt {attempt + 1}")
            return {"response": response.text}
        except Exception as e:
            error_msg = str(e).lower()
            print(f"[NEURAL_LINK] Error on attempt {attempt + 1}: {error_msg}")
            
            if any(keyword in error_msg for keyword in ["429", "quota", "exhausted", "invalid", "403", "permission"]):
                return {"error": "API_EXHAUSTED", "details": str(e)}
            
            if ("503" in error_msg or "timeout" in error_msg or "deadline" in error_msg) and attempt < max_retries:
                wait_time = 2 * (attempt + 1)
                print(f"[NEURAL_LINK] Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
                
            return {"error": f"Neural Link time out: {str(e)}"}

@app.post("/api/download-report")
async def download_report(request: Request):
    data = await request.json()
    text_content = data.get("text")
    if not text_content:
        return {"error": "No content provided for report"}
    
    pdf_bytes = generate_pdf_bytes(text_content)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=Analysis_report.pdf"
        }
    )

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
