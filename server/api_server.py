from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

app = FastAPI()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class Element(BaseModel):
    id: int
    label: str
    value: str = ""
    tagName: str = "UNKNOWN"

class ActionRequest(BaseModel):
    goal: str
    url: str
    history: str
    elements: List[Element]
    screenshot_base64: Optional[str] = None

class NextStep(BaseModel):
    reasoning: str
    action: str  # "click", "type", "scroll", "wait", or "DONE"
    element_id: Optional[int] = None
    text: Optional[str] = None

class StepResponse(BaseModel):
    steps: List[NextStep]

@app.post("/generate-steps", response_model=StepResponse)
async def generate_steps(req: ActionRequest):
    # Prune elements for the prompt to save token count, though keeping all is safer for correct IDs
    # The client has already mapped them to the cleaner structure in 'elements'
    
    visible_elements_json = json.dumps([e.model_dump() for e in req.elements])

    prompt = f"""
    GOAL: {req.goal}
    URL: {req.url}
    
    HISTORY OF ACTIONS:
    {req.history if req.history else "Started task."}
    
    VISIBLE ELEMENTS (JSON):
    {visible_elements_json}

    INSTRUCTIONS:
    1. ANALYZE the visible elements and the screenshot to determine the next steps.
    2. GENERATE a sequence of actions. You can output multiple actions ONLY if they are consecutive form fills (e.g. Type Name -> Type Email) that do not trigger a page reload.
    3. CHECK 'tagName' carefully! 
       - NEVER type into a 'BUTTON', 'A' (link), or 'IMG'. 
       - ONLY type into 'INPUT', 'TEXTAREA', or 'DIV' (contenteditable).
       - If the label "To" is on a button, look for the 'INPUT' or 'DIV' nearby or with an empty label.
    4. IF a button click is required (e.g. "Submit", "Next", "Search"), it MUST be the LAST action in the sequence because the page will likely change.
    5. USE the exact 'id' from the VISIBLE ELEMENTS for 'element_id'. Do not hallucinate IDs.
    6. If the goal is achieved, return action='DONE'.
    7. To send an email: Type 'To' (Input) -> Type 'Subject' -> Type 'Body' -> Click 'Send'.
    """

    messages = [
        {"role": "system", "content": "You are a precise browser automation agent. You output JSON action sequences."},
        {"role": "user", "content": [
            {"type": "text", "text": prompt}
        ]}
    ]

    # Only add image if provided
    if req.screenshot_base64:
        messages[1]["content"].append({
            "type": "image_url", 
            "image_url": {"url": f"data:image/png;base64,{req.screenshot_base64}"}
        })

    response = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=messages,
        response_format=StepResponse,
    )
    
    return response.choices[0].message.parsed

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
