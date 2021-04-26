const { DEFAULT_INTERVAL } = require('../constants');
const { ipcMain, BrowserWindow } = require('electron');

module.exports = ({ store, windows }, callback) => {
    let parent = !!windows.main;

    if(parent) {
        windows.main?.webContents?.send('disable');
    }

    windows.settings = new BrowserWindow({
        width: 580,
        height: 650,

        parent: parent ? windows.main : null,
        modal: !parent,

        frame: false,
        transparent: true,

        resizable: true,

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },

        icon: './src/assets/icons/icon.png',
    });

    windows.settings.loadFile('./src/settings/index.html');

    windows.settings.webContents.on('load', () => {
        windows.settings.webContents.send('request-settings', {
            auto: (store.get('auto-update') || true).toString(),
            interval: store.get('interval') || DEFAULT_INTERVAL
        });
    })

    ipcMain.once('close-settings', () => {
        if(parent) {
            windows.main?.webContents?.send('enable');
        }

        if(windows.settings ? !windows.settings.closed : false) {
            windows.settings.close();
        }

        windows.settings = null;

        if(typeof callback === 'function') {
            callback();
        }
    });
}