import tkinter as tk
from threading import Thread
import uvicorn
from fastapi import FastAPI
import queue
import sys

# --- Configuration ---
# OFFSETS are now handled dynamically by the Client (agentic_screen.py) detecting window position.
# We set these to 0 here to avoid double-offsetting.
BROWSER_HEADER_OFFSET_Y = 0  
BROWSER_OFFSET_X = 0           

app = FastAPI()
command_queue = queue.Queue()

class ArrowController:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Agent Arrow")
        
        # 1. Remove Window Chrome (Frameless)
        self.root.overrideredirect(True)
        
        # 2. Keep Topmost
        self.root.attributes("-topmost", True)
        
        # 3. Canvas for Drawing
        self.width = 400
        self.height = 150
        self.root.geometry(f"{self.width}x{self.height}+0+0")
        
        # Use a distinctive background color that we could potentially make transparent
        # For now, just a white box is safer/simpler ensuring visibility
        self.canvas = tk.Canvas(self.root, width=self.width, height=self.height, bg="white", highlightthickness=2, highlightbackground="red")
        self.canvas.pack()
        
        # 4. Create Graphical Elements
        # A Big Red Arrow pointing to the top-left corner of the window (0,0)
        # We start the arrow slightly offset so the tip lands at 0,0 relative to the window
        # Points: (TipX, TipY), (BackX, BackY)
        self.arrow = self.canvas.create_line(60, 60, 5, 5, arrow=tk.LAST, arrowshape=(30, 40, 10), width=8, fill="red")
        
        # Text Instruction - Styled for readability
        self.text_label = self.canvas.create_text(
            70, 40, 
            text="Waiting...", 
            anchor="nw", 
            width=300,
            font=("Arial", 18, "bold"), # Clearer font
            fill="#333333" # Softer black
        )
        
        # Initial State: Hidden
        self.root.withdraw()

    def process_queue(self):
        """
        Polls the queue for commands from the FastAPI thread.
        Run by the Tkinter main loop.
        """
        try:
            while not command_queue.empty():
                cmd, args = command_queue.get_nowait()
                if cmd == "show":
                    self._show_arrow(*args)
                elif cmd == "hide":
                    self.root.withdraw()
        except Exception as e:
            print(f"GUI Error: {e}")
        finally:
            # Check again in 100ms
            self.root.after(100, self.process_queue)

    def _show_arrow(self, x, y, label, instruction):
        """
        Moves the window so the arrow points to (x, y).
        Since the arrow tip is at local (5,5), we place window at (x-5, y-5).
        Plus offsets for browser chrome.
        """
        screen_x = int(x) + BROWSER_OFFSET_X
        # screen_y = int(y) + BROWSER_HEADER_OFFSET_Y
        
        # NOTE: Coordinate mapping is tricky because browser content coordinates (from client)
        # exclude the browser UI (tabs, address bar), but Tkinter uses absolute screen coordinates.
        # If your browser is maximized, you need to add the header height.
        # If the arrow is OFF, try adjusting BROWSER_HEADER_OFFSET_Y at the top of this file.
        
        screen_y = int(y) + BROWSER_HEADER_OFFSET_Y
        
        # Adjust for arrow tip internal offset so the point (5,5) lands on the target
        window_x = screen_x - 5
        window_y = screen_y - 5
        
        print(f"Displaying arrow for '{label}' at Screen({window_x}, {window_y})")
        
        # Move window
        self.root.geometry(f"+{window_x}+{window_y}")
        
        # Update Text
        self.canvas.itemconfig(self.text_label, text=instruction)
        
        # Show
        self.root.deiconify()
        self.root.lift()

    def start(self):
        print("Starting GUI Loop...")
        self.root.after(100, self.process_queue)
        self.root.mainloop()

# --- API Endpoints ---

@app.get("/set-arrow")
def set_arrow(x: int, y: int, label: str, instruction: str):
    """
    Receives request from agentic_screen.py to point at something.
    """
    # Push to queue so Tkinter thread handles it
    command_queue.put(("show", (x, y, label, instruction)))
    return {"status": "ok", "message": f"Arrow pointing to {x},{y}"}

@app.get("/clear-arrow")
def clear_arrow():
    command_queue.put(("hide", None))
    return {"status": "ok"}

# --- Main Execution ---

def run_uvicorn():
    uvicorn.run(app, host="0.0.0.0", port=3000, log_level="warning")

if __name__ == "__main__":
    # 1. Start Web Server in Background Thread
    server_thread = Thread(target=run_uvicorn, daemon=True)
    server_thread.start()
    print("Guidance Server listening on port 3000")
    
    # 2. Start GUI in Main Thread (Tkinter requirement)
    gui = ArrowController()
    gui.start()
