const { app, ipcMain, BrowserWindow, Menu, MenuItem } = require('electron');
const exec = require('child_process').exec;
const fs = require('fs');

const isSingleInstanceLocked = app.requestSingleInstanceLock()

const { DEFAULT_INTERVAL, RESOURCES } = require('./modules/constants');
const { SettingsWindow, AppWindow } = require('./modules/windows');
const { reset, restart } = require('./modules/application');

const wallpaper = require('./modules/wallpaper');
const store = require('./modules/store').get();

let WindowList = require('./modules/windows/WindowList');
let tray = require('./modules/tray');


if(!isSingleInstanceLocked) {
    app.quit();
} else {
    if(!fs.existsSync(RESOURCES.API)) {
        fs.copyFileSync('./api.js', RESOURCES.API);
    }

    let interval = null;

    if(!store.get('beta')) {
        const menu = new Menu();

        menu.append(new MenuItem({
            label: 'Reset',
            submenu: [ {
                role: 'help',
                accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+R' : 'Ctrl+Shift+R',
                click: reset
            } ]
        }));

        Menu.setApplicationMenu(menu);
    }

    ipcMain.on('token', (channel, token) => {
        store.set('token', token || '');

        if(WindowList.TokenWindow ? !WindowList.TokenWindow.closed : false) {
            WindowList.TokenWindow.close();
        }
    });

    ipcMain.on('open-api-file', () => {
        let cl;

        switch(process.platform) {
            case 'darwin':
                cl = 'open';
                break;
            case 'win32' || 'win64':
                cl = 'start';
                break;
            default:
                cl = 'xdg-open';
        }

        exec(`${ cl } ${ RESOURCES.API }`);
    });

    ipcMain.on('item', (channel, item) => {
        store.set('item', item || '');
    });

    ipcMain.on('update', () => {
        wallpaper.update();
    });

    ipcMain.on('settings', () => {
        SettingsWindow();
    });

    ipcMain.on('circle', () => {
        wallpaper.circle();
    });

    ipcMain.on('reset', () => {
        reset();
    });

    ipcMain.on('restart', () => {
        restart();
    });

    ipcMain.on('quit', () => {
        console.log('QUIT')
        app.quit();
    });

    app.on('ready', () => {
        tray();

        AppWindow();

        app.on('activate', () => {
            if(BrowserWindow.getAllWindows().length === 0) {
                AppWindow();
            }
        });
    });

    app.on('window-all-closed', e => e.preventDefault());

    wallpaper.circle();

    fs.watchFile(RESOURCES.API, {
        interval: 1000
    }, () => {
        restart();
    });

    app.on('second-instance', () => {
        if(!!WindowList.AppWindow) {
            if(WindowList.AppWindow.isMinimized()) WindowList.AppWindow.restore();
            WindowList.AppWindow.focus()
        }
    });
}

require('./modules/autolaunch')();