const { ipcMain, BrowserWindow } = require('electron');

module.exports = ({ store, windows }, callback) => {
    if(store.get('token') ? store.get('token')?.length === 0 : true) {
        if(windows.settings ? !windows.settings.closed : false) {
            windows.settings.close();
        }

        let parent = !!windows.main;

        if(parent) {
            windows.main.webContents.send('disable');
        }

        windows.token = new BrowserWindow({
            width: 420,
            height: 450,

            parent: parent ? windows.main : null,
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

        windows.token.loadFile('./src/token/index.html');

        windows.token.once('closed', () => {
            if(typeof callback === 'function' && store.get('token') ? store.get('token')?.length > 0 : false) {
                if(typeof callback === 'function') {
                    callback();
                }
            }
        })

        ipcMain.once('close-token', () => {
            if(parent) {
                windows.main?.webContents?.send('enable');
            }

            if(windows.token ? !windows.token.closed : false) {
                windows.token.close();
            }

            windows.token = null;
        });
    } else {
        if(typeof callback === 'function') {
            callback();
        }
    }
}