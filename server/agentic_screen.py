import asyncio
import json
import base64
import os
import httpx
from typing import Optional, List, Dict, Any
from playwright.async_api import async_playwright

# --- Configuration ---
API_URL = "http://localhost:8000/generate-steps"
GUIDANCE_URL = "http://localhost:3000" 

def encode_image(image_path):
    if not os.path.exists(image_path):
        return None
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

async def get_next_steps_from_api(goal: str, elements: List[Dict], url: str, history: str, screenshot_path: str = "agent_view.png"):
    base64_image = encode_image(screenshot_path)
    
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
    """
    Scans the page for interactable elements and assigns a temporary data-ai-id.
    """
    js_logic = """
    () => {
        const selectors = "button, input, a, [role='button'], [role='link'], textarea, [contenteditable='true'], [role='textbox']";
        
        return Array.from(document.querySelectorAll(selectors))
            .map((el, i) => {
                el.setAttribute('data-ai-id', i); 
                const r = el.getBoundingClientRect();
                
                let val = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : el.innerText;

                let typeHint = 'ELEMENT';
                if (el.getAttribute('contenteditable') === 'true' || el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    typeHint = 'INPUT';
                } else if (el.tagName === 'A' || el.getAttribute('role') === 'link') {
                    typeHint = 'LINK';
                } else if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
                    typeHint = 'BUTTON';
                }

                let rawLabel = (el.ariaLabel || el.placeholder || el.getAttribute('name') || el.innerText || el.title || "unlabeled").trim().substring(0, 50).replace(/\\n/g, ' ');
                
                return {
                    element_id: i,
                    label: `${rawLabel} [${typeHint}]`,
                    value: val ? val.substring(0, 50).trim() : "",
                    tagName: el.tagName,
                    rect: { x: r.left, y: r.top, w: r.width, h: r.height },
                    isVisible: r.width > 2 && r.height > 2 && window.getComputedStyle(el).display !== 'none'
                };
            }).filter(item => item.isVisible);
    }
    """
    elements = await page.evaluate(js_logic)
    with open("page_map.json", "w") as f:
        json.dump(elements, f, indent=4)
    return elements

async def highlight_element_in_browser(page, element_index):
    """
    Injects CSS to highlight the specific element in the browser.
    This guarantees accurate positioning regardless of window coordinates.
    """
    await page.evaluate(f"""
        () => {{
            // Remove old highlights
            const old = document.querySelectorAll('.agent-focus-ring');
            old.forEach(el => el.classList.remove('agent-focus-ring'));
            
            // Add style if missing
            if (!document.getElementById('agent-styles')) {{
                const style = document.createElement('style');
                style.id = 'agent-styles';
                style.textContent = `
                    .agent-focus-ring {{
                        outline: 4px solid #ff0000 !important;
                        outline-offset: 2px !important;
                        box-shadow: 0 0 15px rgba(255, 0, 0, 0.5) !important;
                        z-index: 2147483647 !important;
                    }}
                `;
                document.head.appendChild(style);
            }}

            const el = document.querySelector('[data-ai-id="{element_index}"]');
            if (el) {{
                el.classList.add('agent-focus-ring');
                // el.scrollIntoView({{behavior: 'smooth', block: 'center'}});
            }}
        }}
    """)

async def send_guidance_request(x: int, y: int, w: int, h: int, label: str, instruction: str):
    """Sends the calculated screen coordinates to the guidance server."""
    try:
        params = {"x": x, "y": y, "w": w, "h": h, "label": label, "instruction": instruction}
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.get(f"{GUIDANCE_URL}/set-arrow", params=params)
    except Exception as e:
        print(f"Guidance Error: {e}")

async def clear_guidance():
    """Removes the dimming overlay from the screen."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.get(f"{GUIDANCE_URL}/clear-arrow")
    except:
        pass

async def get_browser_offsets(page):
    """Detects window position and high-DPI scaling factor."""
    return await page.evaluate("""
        () => {
            return {
                screenX: window.screenX,
                screenY: window.screenY,
                # This is the height of the browser's tabs and address bar
                topOffset: window.outerHeight - window.innerHeight,
                dpr: window.devicePixelRatio || 1
            }
        }
    """)

async def wait_for_user_interaction(page):
    """Pauses the script until the user clicks or presses a key."""
    print("Waiting for USER action...")
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
    # Clear UI immediately so user can see what they're doing next
    await clear_guidance() 
    await asyncio.sleep(0.5)

async def run_autonomous_loop(goal: str):
    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        except Exception as e:
            print("Error: Ensure Chrome is running with --remote-debugging-port=9222")
            return

        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()
        history, step_count = "", 0
        
        while step_count < 20:
            print(f"\n--- STEP {step_count + 1} ---")
            elements = await get_and_save_map(page)
            screenshot_path = "agent_view.png"
            await page.screenshot(path=screenshot_path)
            
            offsets = await get_browser_offsets(page)
            dpr = offsets['dpr']

            steps = await get_next_steps_from_api(goal, elements, page.url, history, screenshot_path)
            if not steps:
                await asyncio.sleep(2)
                continue
                
            for step in steps:
                action_type = step.get('action', '').lower()
                if action_type == 'done': return

                target_id = step.get('element_id')
                target_element = next((e for e in elements if e['element_id'] == target_id), None)
                if not target_element: break
                
                # --- CALIBRATED PHYSICAL MATH ---
                rect = target_element['rect']
                w_physical, h_physical = rect['w'] * dpr, rect['h'] * dpr
                
                # window.screenX/Y are already physical in modern browsers
                # topOffset needs scaling to reach the actual content start
                abs_x = (rect['x'] * dpr) + offsets['screenX']
                abs_y = (rect['y'] * dpr) + offsets['screenY'] + (offsets['topOffset'] * dpr)

                label_clean = target_element['label'].split('[')[0].strip()
                instruction = f"Type '{step.get('text')}'" if action_type == 'type' else f"Click on '{label_clean}'"
                
                padding = 5 * dpr
                await highlight_element_in_browser(page, target_element['element_id'])
                await send_guidance_request(int(abs_x - padding), int(abs_y - padding), 
                                            int(w_physical + (padding * 2)), int(h_physical + (padding * 2)), 
                                            label_clean, instruction)

                history += f"Action: {instruction}. "
                await wait_for_user_interaction(page)
                break 
            
            step_count += 1
            await asyncio.sleep(0.5)

if __name__ == "__main__":
    GOAL = "Compose an email to rhimaaron@gmail.com with subject 'Autonomous Test' and body 'This is working!'"
    asyncio.run(run_autonomous_loop(GOAL))