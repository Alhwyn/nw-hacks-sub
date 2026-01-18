const ipc = require('electron').ipcRenderer

// close app
function closeApp(e) {
  e.preventDefault()
  ipc.send('close')
}

document.getElementById("exit-btn").addEventListener("click", closeApp);