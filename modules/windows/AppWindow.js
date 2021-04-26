const { ipcMain, BrowserWindow, app } = require('electron');

module.exports = ({ store, windows }) => {
    windows.main = new BrowserWindow({
        width: 1300,
        height: 770,

        frame: false,
        transparent: true,

        resizable: false,

        icon: './src/assets/icons/icon.png',

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    windows.main.loadFile('./src/app/index.html');

    windows.main.once('closed', () => {
        windows.main = null;
    });

    windows.main.webContents.on('did-finish-load', () => {
        windows.main.webContents.send('items', store.get('item'));
    });

    ipcMain.once('close', () => {
        if(!!windows.main ? !windows.main.closed : false) {
            windows?.main?.close();
        }

        if(!!store.get('quit')) {
            app.quit();
        }
    });
}