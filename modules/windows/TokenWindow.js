const { ipcMain, BrowserWindow } = require('electron');
let { WindowList } = require('./index');

module.exports = callback => {
    if(store.get('token') ? store.get('token')?.length === 0 : true) {
        if(WindowList.SettingsWindow ? !WindowList.SettingsWindow.closed : false) {
            WindowList.SettingsWindow.close();
        }

        let parent = !!WindowList.AppWindow;

        if(parent) {
            WindowList.AppWindow.webContents.send('disable');
        }

        WindowList.TokenWindow = new BrowserWindow({
            width: 420,
            height: 450,

            parent: parent ? WindowList.AppWindow : null,
            modal: !parent,

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

        WindowList.TokenWindow.loadFile('./src/token/index.html');

        WindowList.TokenWindow.once('closed', () => {
            if(typeof callback === 'function' && store.get('token') ? store.get('token')?.length > 0 : false) {
                if(typeof callback === 'function') {
                    callback();
                }
            }
        })

        ipcMain.once('close-token', () => {
            if(parent) {
                WindowList.AppWindow?.webContents?.send('enable');
            }

            if(WindowList.TokenWindow ? !WindowList.TokenWindow.closed : false) {
                WindowList.TokenWindow.close();
            }

            WindowList.TokenWindow = null;
        });
    } else {
        if(typeof callback === 'function') {
            callback();
        }
    }
}