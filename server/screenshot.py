import asyncio
import json
import random
from playwright.async_api import async_playwright

async def get_and_save_map(page):
    js_logic = """
    () => {
        const selectors = "button, input, a, [role='button'], [role='link'], textarea";
        return Array.from(document.querySelectorAll(selectors))
            .map((el, i) => {
                const r = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                
                const isVisible = r.width > 0 && r.height > 0 && 
                                  r.top >= 0 && r.left >= 0 &&
                                  r.bottom <= window.innerHeight &&
                                  r.right <= window.innerWidth &&
                                  style.visibility !== 'hidden' && 
                                  style.display !== 'none';

                return {
                    element_id: i,
                    label: el.ariaLabel || el.innerText || el.placeholder || el.title || "unlabeled",
                    coord: { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) },
                    type: el.tagName,
                    isVisible: isVisible
                };
            }).filter(item => item.isVisible && item.label.length > 1);
    }
    """
    elements = await page.evaluate(js_logic)
    
    # Save the data to a JSON file
    with open("page_map.json", "w") as f:
        json.dump(elements, f, indent=4)
    
    return elements

async def perform_action(page, action_type, x, y, text=None):
    await page.mouse.move(x, y, steps=10) # move mouse :O
    
    if action_type == "click":
        print(f"Action: Clicking at ({x}, {y})")
        await page.mouse.click(x, y)
        
    elif action_type == "type" and text:
        print(f"Action: Typing '{text}' at ({x}, {y})")
        await page.mouse.click(x, y)
        await asyncio.sleep(0.5)

        for char in text:
            await page.keyboard.type(char)
            await asyncio.sleep(random.uniform(0.05, 0.15))
        
        # Optionally hit Enter
        await page.keyboard.press("Enter")

def get_mock_decision():
    return {
        "reasoning": "Testing the compose email functionality.",
        "action": "click",
        "element_id": 32,
    }

async def main():
    async with async_playwright() as p:
        # Attach to your Arch Chromium session
        browser = await p.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.contexts[0].pages[0]
        
        print(f"Sensing: {await page.title()}")
        
        # save the json DOM
        elements = await get_and_save_map(page)
        print(f"Success! Saved {len(elements)} visible elements to 'page_map.json'")
        
        # [debugging purposes] save the current screenshot
        # await page.screenshot(path="agent_view.png")
        # print("Screenshot saved as 'agent_view.png'")
        
        # 2. THINK: Get the fake decision
        decision = get_mock_decision()
        print(f"Mock Decision: {decision['reasoning']}")

        # 3. ACT: Find the coordinate for that ID in our live map
        target = next((e for e in elements if e['element_id'] == decision['element_id']), None)

        action = decision.get("action")
        element_id = decision.get("element_id")
        text_to_type = decision.get("text", None) # Defaults to None if missing

        # 4. Pass it to your "Hand"
        if target:
            await perform_action(
                page, 
                action, 
                target['coord']['x'], 
                target['coord']['y'], 
                text_to_type # This will be None for a simple click
            )
            print("Action performed successfully.")
        else:
            print(f"Error: Element ID {decision['element_id']} not found in live map!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())