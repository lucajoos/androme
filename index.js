const exec = require('child_process').exec;
const { app, ipcMain, BrowserWindow, Menu, MenuItem } = require('electron');

const isSingleInstanceLocked = app.requestSingleInstanceLock()

const fs = require('fs');

const { DEFAULT_INTERVAL, RESOURCES } = require('./modules/constants');
const { SettingsWindow, AppWindow } = require('./modules/windows');

const wallpaper = require('./modules/wallpaper');
const tray = require('./modules/tray');

let { WindowList } = require('./index');

if(!isSingleInstanceLocked) {
    app.quit();
} else {
    if(!fs.existsSync(RESOURCES.API)) {
        fs.copyFileSync('./api.js', RESOURCES.API);
    }

    let tray = null;
    let interval = null;

    let restart = () => {
        app.relaunch();
        app.exit();
    };

    let reset = () => {


        restart();
    };

    if(!store.get('interval')) {
        store.set('interval', DEFAULT_INTERVAL);
    }

    if(typeof store.get('auto-update') !== 'boolean') {
        store.set('auto-update', true);
    }

    if(typeof store.get('show-splash') !== 'boolean') {
        store.set('show-splash', true);
    }

    if(typeof store.get('beta') !== 'boolean') {
        store.set('beta', false);
    }

    if(typeof store.get('quit') !== 'boolean') {
        store.set('quit', false);
    }

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

    let circle = () => {
        if(interval) {
            clearInterval(interval);
        }

        interval = setInterval(() => {
            if(store.get('auto-update')) {
                wallpaper.update();
            }
        }, parseInt(store.get('interval') || DEFAULT_INTERVAL));
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
        circle();
    });

    ipcMain.on('reset', () => {
        reset();
    });

    ipcMain.on('restart', () => {
        restart();
    });

    ipcMain.on('quit', () => {
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

    circle();

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