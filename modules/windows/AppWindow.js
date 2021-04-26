const { ipcMain, BrowserWindow, app } = require('electron');
const store = require('../store').get();

let { WindowList } = require('./index');

module.exports = () => {
    WindowList.AppWindow = new BrowserWindow({
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

    WindowList.AppWindow.loadFile('./src/app/index.html');

    WindowList.AppWindow.once('closed', () => {
        WindowList.AppWindow = null;
    });

    WindowList.AppWindow.webContents.on('did-finish-load', () => {
        WindowList.AppWindow.webContents.send('items', store.get('item'));
    });

    ipcMain.once('close', () => {
        if(!!WindowList.AppWindow ? !WindowList.AppWindow.closed : false) {
            WindowList.AppWindow?.main?.close();
        }

        if(!!store.get('quit')) {
            app.quit();
        }
    });
}