from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import prompt
import uvicorn
import re
import os
from fastapi.responses import FileResponse, Response
from export_pdf import generate_pdf_bytes
import asyncio
from datetime import datetime
from supabase import create_client, Client

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
    sb_url = data.get("supabaseUrl")
    sb_key = data.get("supabaseKey")
    
    if not sb_url or not sb_key:
        return {"error": "Supabase credentials missing. Please connect your database first."}


    supabase: Client = create_client(sb_url, sb_key)

    def query_table(table_name: str, limit: int = 1000, range_start: int = 0, range_end: int = 999):
        """Fetch rows from a specific table. 
        Use this for deep horizontal scans of the entire database.
        Default range is 0-999 (1,000 rows). You have a 1M token context window, 
        so you can pull large datasets for full reconciliation."""
        try:
            print(f"[NEURAL_DATA] Querying {table_name} [Range: {range_start}-{range_end}]")
            response = supabase.table(table_name).select("*").range(range_start, range_end).limit(limit).execute()
            return response.data
        except Exception as e:
            return f"Error querying {table_name}: {str(e)}"

    def get_table_schema(table_name: str):
        try:
            print(f"[NEURAL_DATA] Getting schema for: {table_name}")
            response = supabase.table(table_name).select("*").limit(0).execute()
            return "Schema fetch active. Use query_table to see content."
        except Exception as e:
            return f"Error fetching schema: {str(e)}"

    tools = [query_table, get_table_schema]
    
    import httpx
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(60.0))
    client = genai.Client(api_key=API_KEY, http_options={'httpx_async_client': http_client})
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    system_prompt = prompt.prompt(current_time)
    
    ctx_len = len(user_input) if user_input else 0
    print(f"\n[NEURAL_LINK] Context Received ({ctx_len} chars)")
    print("-" * 50)
    print(user_input[:500] + "..." if ctx_len > 500 else user_input)
    print("-" * 50 + "\n")
    
    formatted_input = (
        f"TIMESTAMP: {current_time}\n\n"
        f"### USER TASK:\n{user_input}\n\n"
        f"### SYSTEM INSTRUCTION REINFORCEMENT:\n"
        "Please address the USER TASK above. You must operate as the 'Neural Database Investigator' "
        "and follow all retrieval and formatting protocols defined in your system instruction."
    )
    
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=tools,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=False),
        max_output_tokens=1000000
    )

    models_to_try = [
        "gemini-3.1-flash",
        "gemini-3.1-flash-lite-preview", 
        "gemini-2.5-flash", 
        "gemini-2.0-flash", 
        "gemini-1.5-flash"
    ]
    
    for model_name in models_to_try:
        try:
            print(f"[NEURAL_LINK] Attempting {model_name} with tools...")
            response = await client.aio.models.generate_content(
                model=model_name,
                contents=formatted_input,
                config=config
            )
            if not response.text:
                raise Exception("Model returned an empty text response (check safety filters or instructions).")

            print(f"[NEURAL_LINK] Success with {model_name}")
            return {"response": response.text}
        except Exception as e:
            err_str = str(e)
            print(f"[NEURAL_LINK] Error with {model_name}: {err_str}")
            should_fallback = any(x in err_str for x in ["404", "NOT_FOUND", "429", "quota", "exhausted", "503", "UNAVAILABLE", "demand", "deadline", "timed out", "timeout"])
            
            if should_fallback:
                if "503" in err_str or "UNAVAILABLE" in err_str:
                    await asyncio.sleep(1.0)
                continue
            return {"error": f"Neural Link failure: {err_str}"}

    return {"error": "All available models exhausted or rate limited."}

@app.post("/api/download-report")
async def download_report(request: Request):
    try:
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
    except Exception as e:
        print(f"[ERROR] PDF Generation failed: {str(e)}")
        return {"error": f"Failed to generate report: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
