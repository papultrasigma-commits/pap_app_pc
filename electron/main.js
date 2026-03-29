import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater'; // <--- Importação corrigida
const { autoUpdater } = pkg;        // <--- Importação corrigida

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
// ... resto do seu código ...
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "PWS",
    autoHideMenuBar: true,
    
    // 👇 REMOVEMOS O FULLSCREEN DAQUI 👇
    
    backgroundColor: '#0f1112', 
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f1112', 
      symbolColor: '#ffffff',
      height: 30
    },
    webPreferences: {
      nodeIntegration: true,
    }
  })

  // 👇 ADICIONE ESTA LINHA AQUI 👇
  // Isto faz com que a janela ocupe o ecrã todo mal abra, mas mantém os botões de fechar/minimizar!
  win.maximize()

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})