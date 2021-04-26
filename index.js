const exec = require('child_process').exec;
const { app, ipcMain, Tray, BrowserWindow, Menu, MenuItem } = require('electron');

const isSingleInstanceLocked = app.requestSingleInstanceLock()

const AutoLaunch = require('auto-launch');
const Store = require('electron-store');

const fs = require('fs');

const store = new Store();

const { DEFAULT_INTERVAL, RESOURCES } = require('./modules/constants');
const { SettingsWindow, AppWindow } = require('./modules/windows')
const wallpaper = require('./modules/wallpaper');

if(!isSingleInstanceLocked) {
    app.quit();
} else {
    if(!fs.existsSync(RESOURCES.API)) {
        fs.copyFileSync('./api.js', RESOURCES.API);
    }

    let windows = {
        main: null,
        splash: null,
        token: null,
        settings: null
    };

    let tray = null;
    let interval = null;

    let restart = () => {
        app.relaunch();
        app.exit();
    };

    let reset = () => {
        store.delete('item');
        store.delete('token');
        store.delete('interval');
        store.delete('auto-update');
        store.delete('show-splash');
        store.delete('quit');
        store.delete('beta');

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
                wallpaper.update({ store, windows });
            }
        }, parseInt(store.get('interval') || DEFAULT_INTERVAL));
    }

    ipcMain.on('token', (channel, token) => {
        store.set('token', token || '');

        if(windows.token ? !windows.token.closed : false) {
            windows.token.close();
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
        wallpaper.update({ store, windows });
    });

    ipcMain.on('settings', () => {
        SettingsWindow({ store, windows });
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
        tray = new Tray(RESOURCES.ICON);

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Open',
                type: 'normal',
                click: () => {
                    if(!!windows.main) {
                        windows.main.focus();
                    } else {
                        AppWindow({ store, windows });
                    }
                }
            },

            {
                label: 'Update Wallpaper',
                type: 'normal',
                click: () => {
                    wallpaper.update({ store, windows });
                }
            },

            {
                label: 'Settings',
                type: 'normal',
                click: () => {
                    SettingsWindow({ store, windows });
                }
            },

            {
                label: 'Reset',
                type: 'normal',
                click: reset
            },

            {
                label: 'Quit',
                type: 'normal',
                click: () => {
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('Androme');
        tray.setContextMenu(contextMenu);

        tray.addListener('click', () => {
            wallpaper.update({ store, windows });
        })

        AppWindow({ store, windows });

        app.on('activate', () => {
            if(BrowserWindow.getAllWindows().length === 0) {
                AppWindow({ store, windows });
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
        if(!!windows.main) {
            if(windows.main.isMinimized()) windows.main.restore();
            windows.main.focus()
        }
    });
}

let launcher = new AutoLaunch({
    name: 'Androme'
});

launcher.isEnabled().then(enabled => {
    if(enabled) return;
    launcher.enable();
}).catch(err => {
    throw err;
});