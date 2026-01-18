document.getElementById("exit-btn").addEventListener("click", (e) => {
  e.preventDefault();
  window.electronAPI.close();
});