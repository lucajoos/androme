const exec = require('child_process').exec;
const { app, ipcMain, screen, Tray, BrowserWindow, Menu, MenuItem } = require('electron');

const isSingleInstanceLocked = app.requestSingleInstanceLock()

const AutoLaunch = require('auto-launch');
const Store = require('electron-store');

const path = require('path');
const fs = require('fs');

const fetch = require('node-fetch');
const { createApi } = require('unsplash-js');

const wallpaper = require('wallpaper');
const store = new Store();

const vm = require('vm');
const { DEFAULT_INTERVAL } = require('./modules/constants');

const { TokenWindow, SettingsWindow, AppWindow } = require('./modules/windows')

if(!isSingleInstanceLocked) {
    app.quit();
} else {
    const resources = {
        api: app.isPackaged ? path.join(process.resourcesPath, './api.js') : path.resolve('./resources/api.js'),
        icon: app.isPackaged ? path.join(process.resourcesPath, './icon.png') : path.resolve('./resources/icon.png')
    };

    if(!fs.existsSync(resources.api)) {
        fs.copyFileSync('./api.js', resources.api);
    }

    let api = fs.readFileSync(resources.api, {
        encoding: 'utf-8'
    });

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

    let changeWallpaper = () => {
        wallpaper.set('./fetch.png').then(() => {
            if(process.platform !== 'linux') {
                try {
                    fs.unlinkSync('./fetch.png');
                } catch(e) {
                    console.error(e);
                    throw e;
                }
            }

            if(!!windows.splash) {
                windows.splash.close();
            } else {
                let parent = !!windows.main;

                if(parent) {
                    windows.main?.webContents?.send('enable');
                }
            }
        }).catch(err => {
            console.error(err);
            throw err;
        });
    };

    let update = () => {
        if(store.get('item')?.toLowerCase()?.trim()?.length > 0) {
            if(store.get('token') ? store.get('token')?.length === 0 : true) {
                TokenWindow(
                    { store, windows },
                    update
                );
            } else if(typeof api === 'string') {
                vm.runInNewContext(api, {
                    module: {},
                    console: console
                })({
                    api: createApi({
                        accessKey: store.get('token'),
                        fetch: fetch
                    }),

                    query: store.get('item')?.toLowerCase()?.trim() || ''
                }).then(url => {
                    splash();

                    fetch(url).then(res => {
                        const dest = fs.createWriteStream('./fetch.png');

                        res.body.pipe(dest);

                        dest.on('finish', () => {
                            changeWallpaper();
                        });
                    }).catch(e => {
                        console.error(e);
                        throw e;
                    });
                }).catch(error => {
                    store.set('token', '');

                    TokenWindow(
                        { store, windows },
                        update
                    );

                    throw error;
                });
            }
        }
    };

    let circle = () => {
        if(interval) {
            clearInterval(interval);
        }

        interval = setInterval(() => {
            if(store.get('auto-update')) {
                update();
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

        exec(`${ cl } ${ resources.api }`);
    });

    ipcMain.on('item', (channel, item) => {
        store.set('item', item || '');
    });

    ipcMain.on('update', () => {
        update();
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
        tray = new Tray(resources.icon);

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Open',
                type: 'normal',
                click: () => {
                    if(!!windows.main) {
                        windows.main.focus();
                    } else {
                        AppWindow({ store, windows, app });
                    }
                }
            },

            {
                label: 'Update Wallpaper',
                type: 'normal',
                click: () => {
                    update();
                }
            },

            {
                label: 'Settings',
                type: 'normal',
                click: () => {
                    settings();
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
            update();
        })

        AppWindow({ store, windows, app });

        app.on('activate', () => {
            if(BrowserWindow.getAllWindows().length === 0) {
                AppWindow({ store, windows, app });
            }
        });
    });

    app.on('window-all-closed', e => e.preventDefault());

    circle();

    fs.watchFile(resources.api, {
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