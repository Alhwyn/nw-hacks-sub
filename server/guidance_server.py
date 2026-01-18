import tkinter as tk
from threading import Thread
import uvicorn
from fastapi import FastAPI
import queue

app = FastAPI()
command_queue = queue.Queue()

class SpotlightController:
    def __init__(self):
        self.root = tk.Tk()
        self.root.withdraw()
        
        self.overlay_color = 'black'
        self.opacity = 0.6 
        
        self.windows = {
            'top': self._create_dimmer(),
            'bottom': self._create_dimmer(),
            'left': self._create_dimmer(),
            'right': self._create_dimmer(),
            'label': self._create_label_window()
        }
        
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()

    def _create_dimmer(self):
        win = tk.Toplevel(self.root)
        win.overrideredirect(True)
        win.attributes("-topmost", True)
        win.configure(bg=self.overlay_color)
        try:
            win.attributes('-alpha', self.opacity)
        except:
            pass
        win.withdraw()
        return win

    def _create_label_window(self):
        win = tk.Toplevel(self.root)
        win.overrideredirect(True)
        win.attributes("-topmost", True)
        win.configure(bg='#ff0000') 
        win.withdraw()
        self.lbl = tk.Label(win, text="", fg="white", bg="#ff0000", 
                           font=("Helvetica", 12, "bold"), padx=10, pady=5)
        self.lbl.pack()
        return win

    def _show_spotlight(self, x, y, w, h, label, instruction):
        sw, sh = self.screen_width, self.screen_height
        
        # Clamp inputs to screen bounds to prevent "Black Box" overflow
        x, y = max(0, x), max(0, y)
        w = min(w, sw - x)
        h = min(h, sh - y)

        # 1. Top Panel: Covers full width from top to y
        self.windows['top'].geometry(f"{sw}x{int(y)}+0+0")
        
        # 2. Bottom Panel: Covers full width from y+h to bottom
        h_bottom = max(0, sh - (y + h))
        self.windows['bottom'].geometry(f"{sw}x{int(h_bottom)}+0+{int(y + h)}")
        
        # 3. Left Panel: Covers left side between the top and bottom panels
        self.windows['left'].geometry(f"{int(x)}x{int(h)}+0+{int(y)}")
        
        # 4. Right Panel: Covers right side between top and bottom panels
        w_right = max(0, sw - (x + w))
        self.windows['right'].geometry(f"{int(w_right)}x{int(h)}+{int(x + w)}+{int(y)}")

        for w_obj in self.windows.values():
            w_obj.deiconify()
            w_obj.lift()

        # Label Position
        self.lbl.config(text=instruction)
        self.windows['label'].update_idletasks()
        lw, lh = self.windows['label'].winfo_width(), self.windows['label'].winfo_height()
        lx = max(5, min(sw - lw - 5, x + (w//2) - (lw//2)))
        ly = y - lh - 5 if y - lh - 5 > 0 else y + h + 5
        self.windows['label'].geometry(f"+{int(lx)}+{int(ly)}")

    def process_queue(self):
        try:
            while not command_queue.empty():
                cmd, args = command_queue.get_nowait()
                if cmd == "show": self._show_spotlight(*args)
                elif cmd == "hide": 
                    for w in self.windows.values(): w.withdraw()
        except: pass
        self.root.after(50, self.process_queue)

    def start(self):
        self.root.after(50, self.process_queue)
        self.root.mainloop()

@app.get("/set-arrow")
def set_arrow(x: int, y: int, w: int, h: int, label: str, instruction: str):
    command_queue.put(("show", (x, y, w, h, label, instruction)))
    return {"status": "ok"}

@app.get("/clear-arrow")
def clear_arrow():
    command_queue.put(("hide", None))
    return {"status": "ok"}

if __name__ == "__main__":
    Thread(target=lambda: uvicorn.run(app, host="0.0.0.0", port=3000), daemon=True).start()
    SpotlightController().start()