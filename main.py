from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import prompt
import uvicorn
import re
import os
from fastapi.responses import FileResponse, Response
from export_pdf import generate_pdf_bytes
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = ''

@app.post("/api/save-key")
async def save_key(request: Request):
    data = await request.json()
    key = data.get("apiKey", "").strip()
    if not key:
        return {"error": "API Key is missing."}

    test_client = genai.Client(api_key=key, http_options={'timeout': 120.0})
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            resp = await test_client.aio.models.generate_content(
                model="gemini-1.5-flash",
                contents=["Verify connection"]
            )
            break
        except Exception as e:
            error_msg = str(e).lower()
            if "404" in error_msg or "not found" in error_msg:
                break
            if any(code in error_msg for code in ["403", "401", "invalid", "permission", "400"]):
                return {"error": f"Invalid API Key or Permission Denied. ({str(e)})", "details": str(e)}
            if any(code in error_msg for code in ["429", "quota", "exhausted"]):
                return {"error": f"API Quota exceeded or rate limited: {str(e)}", "details": str(e)}
            
            if attempt == max_retries - 1:
                return {"error": f"Connection stability issue after {max_retries} attempts.", "details": str(e)}
            
            await asyncio.sleep(1.5 * (attempt + 1))
    
    with open(__file__, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = re.sub(r"^API_KEY\s*=\s*['\"].*?['\"]", f"API_KEY = {repr(key)}", content, flags=re.MULTILINE)
    
    with open(__file__, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    global API_KEY
    API_KEY = key
    
    return {"status": "success"}

@app.post("/api/chat")
async def chat(request: Request):
    data = await request.json()
    user_input = data.get("message")
    
    import httpx
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(180.0))
    client = genai.Client(api_key=API_KEY, http_options={'httpx_async_client': http_client})
    
    system_prompt = prompt.prompt()
    
    max_retries = 1
    for attempt in range(max_retries + 1):
        try:
            print(f"[NEURAL_LINK] Attempt {attempt + 1}: Contacting Gemini (timeout=180s)...")
            response = await client.aio.models.generate_content(
                model="gemini-3.1-flash-lite-preview",
                contents=[f"{system_prompt}\n\nUser Input: {user_input}"]
            )
            print(f"[NEURAL_LINK] Success on attempt {attempt + 1}")
            return {"response": response.text}
        except Exception as e:
            e_str = str(e) if str(e) else repr(e)
            error_msg = e_str.lower()
            print(f"[NEURAL_LINK] Error on attempt {attempt + 1}: {e_str}")
            
            if any(keyword in error_msg for keyword in ["429", "quota", "exhausted", "404", "not found"]):
                print("[NEURAL_LINK] 3.1 flash lite model exhausted/unavailable. Routing to 2.5-flash fallback...")
                try:
                    fallback_response = await client.aio.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=[f"{system_prompt}\n\nUser Input: {user_input}"]
                    )
                    print("[NEURAL_LINK] Fallback success!")
                    return {"response": fallback_response.text}
                except Exception as fb_e:
                    fb_str = str(fb_e) if str(fb_e) else repr(fb_e)
                    if any(kw in fb_str.lower() for kw in ["invalid", "403", "permission"]):
                        return {"error": "API_EXHAUSTED", "details": fb_str}
                    return {"error": f"Neural Link time out (Fallback failed): {fb_str}"}
            
            if any(keyword in error_msg for keyword in ["invalid", "403", "permission"]):
                return {"error": "API_EXHAUSTED", "details": e_str}
            
            if ("503" in error_msg or "timeout" in error_msg or "deadline" in error_msg) and attempt < max_retries:
                wait_time = 2 * (attempt + 1)
                print(f"[NEURAL_LINK] Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
                continue
                
            return {"error": f"Neural Link time out: {e_str}"}

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
