import asyncio
import json
import base64
import os
import httpx
from typing import Optional, List, Dict, Any
from playwright.async_api import async_playwright

# --- Configuration ---
API_URL = "http://localhost:8000/generate-steps"
GUIDANCE_URL = "http://localhost:3000/set-arrow" # Placeholder for external guidance service

def encode_image(image_path):
    if not os.path.exists(image_path):
        return None
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

async def get_next_steps_from_api(goal: str, elements: List[Dict], url: str, history: str, screenshot_path: str = "agent_view.png"):
    base64_image = encode_image(screenshot_path)
    
    # Prepare payload conforming to the API schema
    # Map our internal element structure to the API's expected structure
    api_elements = [
        {"id": e["element_id"], "label": e["label"], "value": e.get("value", ""), "tagName": e.get("tagName", "UNKNOWN")} 
        for e in elements
    ]
    
    payload = {
        "goal": goal,
        "url": url,
        "history": history,
        "elements": api_elements,
        "screenshot_base64": base64_image
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(API_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("steps", [])
        except Exception as e:
            print(f"Error calling LLM API: {e}")
            return []

async def get_and_save_map(page):
    # This logic dumps the current state of interactable elements
    js_logic = """
    () => {
        // Clear previous highlights (overlays and inline styles)
        document.querySelectorAll('.ai-highlight').forEach(el => el.remove());
        document.querySelectorAll('[data-ai-id]').forEach(el => {
            el.style.border = '';
            el.style.backgroundColor = '';
        });
        
        const selectors = "button, input, a, [role='button'], [role='link'], textarea, [contenteditable='true'], [role='textbox']";
        
        return Array.from(document.querySelectorAll(selectors))
            .map((el, i) => {
                el.setAttribute('data-ai-id', i); 
                const r = el.getBoundingClientRect();
                
                let val = "";
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    val = el.value;
                } else {
                    val = el.innerText;
                }

                // --- NEW LOGIC: Explicit Type Hinting ---
                let typeHint = el.tagName;
                if (el.getAttribute('contenteditable') === 'true' || el.isContentEditable) {
                    typeHint = 'INPUT';
                } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    typeHint = 'INPUT';
                } else if (el.tagName === 'A' || el.getAttribute('role') === 'link') {
                    typeHint = 'LINK';
                } else if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
                    typeHint = 'BUTTON';
                }

                // IMPROVED LABELING: Check 'name' attribute which Gmail uses for 'subjectbox'
                let rawLabel = (el.ariaLabel || el.placeholder || el.getAttribute('name') || el.innerText || el.title || "unlabeled").trim().substring(0, 50).replace(/\\n/g, ' ');
                let finalLabel = `${rawLabel} [${typeHint}]`; 
                // ----------------------------------------

                return {
                    element_id: i,
                    label: finalLabel,
                    value: val ? val.substring(0, 50).trim() : "",
                    tagName: el.tagName,
                    coord: { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) },
                    rect: { x: r.left, y: r.top, w: r.width, h: r.height },
                    isVisible: r.width > 2 && r.height > 2 && window.getComputedStyle(el).display !== 'none'
                };
            }).filter(item => item.isVisible);
    }
    """
    elements = await page.evaluate(js_logic)
    
    # SAVE JSON for debugging
    with open("page_map.json", "w") as f:
        json.dump(elements, f, indent=4)
        
    return elements

async def send_guidance_request(x: int, y: int, label: str, instruction: str):
    """
    Sends a GET request to the external service to render a big red arrow.
    """
    try:
        params = {"x": x, "y": y, "label": label, "instruction": instruction}
        print(f"--> Sending GUIDANCE: Arrow at ({x}, {y}) [Screen Absolute] for '{label}'")
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.get(GUIDANCE_URL, params=params)
    except Exception as e:
        print(f"Warning: Could not send guidance request: {e}")

async def get_browser_offsets(page):
    """
    Detects the browser window's absolute position on the screen to calibrate the arrow.
    """
    return await page.evaluate("""
        () => {
            const topBarHeight = window.outerHeight - window.innerHeight;
            return {
                screenX: window.screenX,
                screenY: window.screenY,
                topOffset: topBarHeight
            }
        }
    """)

async def wait_for_user_interaction(page):
    """
    Waits for the user to perform an action (Click or Key Press).
    """
    print("Waiting for USER to perform action...")
    
    # We inject a listener to detect clicks or key presses
    # resolving the promise when an event occurs.
    await page.evaluate("""
        new Promise(resolve => {
            const listener = () => {
                document.removeEventListener('click', listener, true);
                document.removeEventListener('keydown', listener, true);
                resolve();
            };
            document.addEventListener('click', listener, {capture: true, once: true});
            document.addEventListener('keydown', (e) => {
                if(e.key === 'Enter') listener();
            }, {capture: true, once: true});
        })
    """)
    print("User action detected! Resuming...")
    await asyncio.sleep(1.0) # Wait a bit for page to update after user action

async def run_autonomous_loop(goal: str):
    async with async_playwright() as p:
        # Connect to existing Chrome instance
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        except Exception as e:
            print(f"Could not connect to Chrome: {e}")
            print("Please run: google-chrome --remote-debugging-port=9222")
            return

        context = browser.contexts[0]
        if not context.pages:
            page = await context.new_page()
        else:
            page = context.pages[0] # Use the first active tab
        
        print(f"Connected to {page.url}")
        
        history = ""
        step_count = 0
        MAX_STEPS = 20
        
        while step_count < MAX_STEPS:
            print(f"\n--- STEP {step_count + 1} ---")
            
            # 1. SENSE
            print("Capturing state...")
            
            elements = await get_and_save_map(page)
            
            # DEBUG: Print detected inputs to help diagnose issues
            print("--- Detected Important Inputs ---")
            for e in elements:
                if "INPUT" in e['label'] or "subject" in e['label'].lower() or "body" in e['label'].lower():
                    print(f"[{e['element_id']}] {e['label']}")
            print("---------------------------------")

            screenshot_path = "agent_view.png"
            await page.screenshot(path=screenshot_path)
            
            # 2. THINK (Call API)
            print("Thinking (remote)...")
            
            # --- CALIBRATION ---
            # Get current window position to adjust coordinates for the external overlay
            offsets = await get_browser_offsets(page)
            # -------------------

            steps = await get_next_steps_from_api(
                goal=goal,
                elements=elements,
                url=page.url,
                history=history,
                screenshot_path=screenshot_path
            )
            
            if not steps:
                print("No steps generated. Retrying...")
                await asyncio.sleep(2)
                continue
                
            # 3. ACT (Execute Sequence)
            sequence_break = False
            
            for step in steps:
                print(f"Plan: {step}") 
                
                action_type = step.get('action', '').lower()
                step['action'] = action_type 

                if action_type == 'done':
                    print("Goal Success!")
                    return
                
                # Handle Non-Element Actions
                if action_type == 'wait':
                    print("Executing: WAIT")
                    await asyncio.sleep(2.0)
                    history += "Step: waited. "
                    continue

                # Validate Element Exists
                target_id = step.get('element_id')
                
                if target_id is None:
                    # If action requires an ID but is None...
                    if action_type in ['click', 'type']:
                        print(f"Warning: Action '{action_type}' requires an element_id but got None. Skipping.")
                        sequence_break = True
                        break
                    else:
                        print(f"Executing: {action_type} (Global)")
                        history += f"Step: {action_type}. "
                        continue

                target_element = next((e for e in elements if e['element_id'] == target_id), None)
                
                if not target_element:
                    print(f"Warning: Planned element ID {target_id} not found in current map. Breaking sequence.")
                    sequence_break = True
                    break
                
                # --- NEW GUIDANCE MODE ---
                # Calculate Absolute Screen Coordinates
                # element_viewport_x + window_screen_x
                # element_viewport_y + window_screen_y + estimated_header_height
                
                abs_x = target_element['coord']['x'] + offsets['screenX']
                abs_y = target_element['coord']['y'] + offsets['screenY'] + offsets['topOffset']
                
                # Friendly Instruction Formatting
                label_clean = target_element['label'].split('[')[0].strip() # Remove the [INPUT] helper tag
                
                if action_type == 'click':
                    instruction = f"Please click on '{label_clean}'"
                elif action_type == 'type':
                    txt = step.get('text', 'text')
                    instruction = f"Type '{txt}' here"
                else:
                    instruction = f"{action_type.title()} on {label_clean}"

                # 1. Send Guidance (Arrow)
                await send_guidance_request(int(abs_x), int(abs_y), label_clean, instruction)

                # 2. Update History (Assume success because user will do it)
                history += f"Step {step_count+1}: {instruction}. "

                # 3. Wait for User to do it
                try:
                    await wait_for_user_interaction(page)
                except Exception as e:
                    print(f"Wait failed: {e}")
                
                # 4. Break sequence to re-sense after EVERY user action
                # Since the user logic is opaque, we must assume the page *might* change.
                print("User acted. Re-sensing page...")
                sequence_break = True
                break
            
            if sequence_break:
                print("Sequence interrupted for refresh...")
            
            step_count += 1
            await asyncio.sleep(1)
            
            if sequence_break:
                print("Sequence interrupted, re-sensing...")
            
            step_count += 1
            await asyncio.sleep(1)

if __name__ == "__main__":
    # Example usage
    GOAL = "Compose and send an email to rhimaaron@gmail.com with subject 'Hello' and body 'This is a test email sent by an autonomous agent.'"
    print("Starting client. Ensure 'server/api_server.py' is running on port 8000.")
    asyncio.run(run_autonomous_loop(GOAL))
