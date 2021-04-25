const { app, ipcMain, screen, Tray, BrowserWindow, Menu, MenuItem } = require('electron');

const AutoLaunch = require('auto-launch');
const Store = require('electron-store');

const path = require('path');
const fs = require('fs');

const fetch = require('node-fetch');
const {createApi} = require('unsplash-js');

let Jimp = require('jimp');
const wallpaper = require('wallpaper');

const store = new Store();
const api = require('./api');

let windows = {
    main: null,
    splash: null,
    token: null,
    settings: null
};

let tray = null;
let interval = null;

let SCREEN = {};
const DEFAULT_INTERVAL = 1800000;
const GRADIENT = 256;

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
        submenu: [{
            role: 'help',
            accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+R' : 'Ctrl+Shift+R',
            click: reset
        }]
    }));

    Menu.setApplicationMenu(menu);
}

let splash = () => {
    let parent = !!windows.main;

    if(parent) {
        windows.main?.webContents?.send('disable');
    }

    if(store.get('show-splash')) {
        windows.splash = new BrowserWindow({
            width: 500,
            height: 300,

            parent: parent ? windows.main : null,
            modal: !parent,

            frame: false,
            transparent: true,

            resizable: false,

            icon: './src/assets/icons/icon.png',
        });

        windows.splash.loadFile('./src/splash/index.html');

        windows.splash.once('closed', () => {
            if(parent) {
                windows.main?.webContents?.send('enable');
            }

            windows.splash = null;
        });
    }
}

let settings = () => {
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
    });
}

let token = callback => {
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
                callback();
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
        callback();
    }
};

let swp = () => {
    wallpaper.set('./fetch.png').then(() => {
        try {
            fs.unlinkSync('./fetch.png');
        } catch(e) {
            console.error(e);
            throw e;
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
            token(
                update
            );
        } else if(typeof api === 'function') {
            let unsplashApi = createApi({
                accessKey: store.get('token'),
                fetch: fetch
            });

            api({
                api: unsplashApi,
                query: store.get('item')?.toLowerCase()?.trim() || ''
            }).then(url => {
                splash();

                fetch(url).then(res => {
                    const dest = fs.createWriteStream('./fetch.png');

                    res.body.pipe(dest);

                    dest.on('finish', () => {
                        if(store.get('beta')) {
                            try {
                                Jimp.read('./fetch.png', (error, fetch) => {
                                    if(error) {
                                        console.error(error);
                                        throw error;
                                    }

                                    Jimp.read(app.isPackaged ? path.join(process.resourcesPath, './gradient.png') : path.resolve('./resources/gradient.png'), (error, gradient) => {
                                        if(error) {
                                            console.error(error);
                                            throw error;
                                        }

                                        Jimp.loadFont(app.isPackaged ? path.join(process.resourcesPath, './fonts/fnt/montserrat-900.fnt') : path.resolve('./resources/fonts/fnt/montserrat-900.fnt')).then(bold => {
                                            Jimp.loadFont(app.isPackaged ? path.join(process.resourcesPath, './fonts/fnt/montserrat-400.fnt') : path.resolve('./resources/fonts/fnt/montserrat-400.fnt')).then(medium => {
                                                fetch
                                                    .cover(SCREEN.width, SCREEN.height)
                                                    .composite(gradient.cover(SCREEN.width, GRADIENT), 0, SCREEN.height - GRADIENT - 35, {
                                                        mode: Jimp.BLEND_OVERLAY,
                                                        opacitySource: 1,
                                                        opacityDest: 1
                                                    })
                                                    .print(
                                                        bold,
                                                        0,
                                                        0,
                                                        {
                                                            text: response.response.user.name.toUpperCase(),
                                                            alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT,
                                                            alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
                                                        },
                                                        SCREEN.width - 115,
                                                        SCREEN.height - 85 - 45
                                                    )
                                                    .print(
                                                        medium,
                                                        0,
                                                        0,
                                                        {
                                                            text: 'from Unsplash',
                                                            alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT,
                                                            alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
                                                        },
                                                        SCREEN.width - 115,
                                                        SCREEN.height - 90
                                                    )
                                                    .write('./fetch.png');

                                                swp();
                                            })
                                        });
                                    })
                                });
                            } catch(e) {
                                console.error(e);
                                throw e;
                            }
                        } else {
                            swp();
                        }
                    });
                }).catch(e => {
                    console.error(e);
                    throw e;
                });
            }).catch(error => {
                store.set('token', '');

                token(
                    update
                );

                throw error;
                process.exit(1);
            });
        }
    }
};

let init = () => {
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

});

ipcMain.on('item', (channel, item) => {
    store.set('item', item || '');
});

ipcMain.on('update', () => {
    update();
});

ipcMain.on('settings', () => {
    settings();
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
    SCREEN = screen.getPrimaryDisplay().workAreaSize;

    tray = new Tray(app.isPackaged ? path.join(process.resourcesPath, './icon.png') : path.resolve('./resources/icon.png'));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
            type: 'normal',
            click: () => {
                if(!!windows.main) {
                    windows.main.focus();
                } else {
                    init();
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

    init();

    app.on('activate', () => {
        if(BrowserWindow.getAllWindows().length === 0) {
            init();
        }
    });
});

app.on('window-all-closed', e => e.preventDefault());

circle();

let launcher = new AutoLaunch({
    name: 'Androme'
});

launcher.isEnabled().then(enabled => {
    if(enabled) return;
    launcher.enable();
}).catch(err => {
    throw err;
});