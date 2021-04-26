const { ipcMain, BrowserWindow } = require('electron');
const store = require('../store').get();

const { DEFAULT_INTERVAL } = require('../constants');
let WindowList = require('./WindowList');

module.exports = callback => {
    let parent = !!WindowList.AppWindow;

    if(parent) {
        WindowList.AppWindow?.webContents?.send('disable');
    }

    WindowList.SettingsWindow = new BrowserWindow({
        width: 580,
        height: 650,

        parent: parent ? WindowList.AppWindow : null,
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

    WindowList.SettingsWindow.loadFile('./src/settings/index.html');

    WindowList.SettingsWindow.webContents.on('load', () => {
        WindowList.SettingsWindow.webContents.send('request-settings', {
            auto: (store.get('auto-update') || true).toString(),
            interval: store.get('interval') || DEFAULT_INTERVAL
        });
    })

    ipcMain.once('close-settings', () => {
        if(parent) {
            WindowList.AppWindow?.webContents?.send('enable');
        }

        if(WindowList.SettingsWindow ? !WindowList.SettingsWindow.closed : false) {
            WindowList.SettingsWindow.close();
        }

        WindowList.SettingsWindow = null;

        if(typeof callback === 'function') {
            callback();
        }
    });
}