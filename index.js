const { app, ipcMain, screen, Tray, BrowserWindow, Menu, MenuItem } = require('electron');

if (require('electron-squirrel-startup')) return app.quit();

const AutoLaunch = require('auto-launch');
const Store = require('electron-store');

const path = require('path');
const fs = require('fs');

const fetch = require('node-fetch');
const {createApi} = require('unsplash-js');

let Jimp = require('jimp');
const wallpaper = require('wallpaper');

const store = new Store();

let windows = {
    main: null,
    splash: null,
    token: null,
    settings: null
};

let tray = null;
let visible = false;
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

    windows.splash = new BrowserWindow({
        width: 500,
        height: 300,
        show: false,

        parent: parent ? windows.main : null,
        modal: !parent,

        frame: false,
        transparent: true,

        resizable: false,

        icon: path.resolve('./src/assets/icons/icon.png'),
    });

    windows.splash.loadFile(path.resolve('./src/splash/index.html'));

    windows.splash.once('ready-to-show', () => {
        windows.splash.show();
    });

    windows.splash.once('closed', () => {
        if(parent) {
            windows.main?.webContents?.send('enable');
        }

        windows.splash = null;
    });
}

let settings = () => {
    let parent = !!windows.main;

    if(parent) {
        windows.main?.webContents?.send('disable');
    }

    windows.settings = new BrowserWindow({
        width: 580,
        height: 650,
        show: false,

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

        icon: path.resolve('./src/assets/icons/icon.png'),
    });

    windows.settings.loadFile(path.resolve('./src/settings/index.html'));

    windows.settings.once('ready-to-show', () => {
        windows.settings.show();
    });

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
            show: false,

            parent: parent ? windows.main : null,
            modal: !parent,

            frame: false,
            transparent: true,

            resizable: false,

            icon: path.resolve('./src/assets/icons/icon.png'),

            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            }
        });

        windows.token.loadFile(path.resolve('./src/token/index.html'));

        windows.token.once('ready-to-show', () => {
            windows.token.show();
        });

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
        } else {
            let api = createApi({
                accessKey: store.get('token'),
                fetch: fetch
            });

            if(api) {
                let si = store.get('item')?.toLowerCase()?.trim()?.split(',');

                api.photos.getRandom({
                    orientation: 'landscape',
                    query: si[Math.floor(Math.random() * si.length)] || 'scenery'
                }).then(response => {
                    if(response.errors) {
                        if(response.errors?.length > 0 ? response.errors[0] === 'OAuth error: The access token is invalid' : (response.errors?.status === 401)) {
                            store.set('token', '');

                            token(
                                update
                            );
                        }
                    } else {
                        splash();

                        fetch(response.response.urls.raw).then(res => {
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

                                            Jimp.read('./gradient.png', (error, gradient) => {
                                                if(error) {
                                                    console.error(error);
                                                    throw error;
                                                }

                                                Jimp.loadFont('./src/assets/fonts/fnt/montserrat-900.fnt').then(bold => {
                                                    Jimp.loadFont('./src/assets/fonts/fnt/montserrat-400.fnt').then(medium => {
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
                        })
                    }

                }).catch(e => {
                    console.error(e);
                    throw e;
                })
            }
        }
    }
};

let init = () => {
    windows.main = new BrowserWindow({
        width: 1300,
        height: 770,
        show: false,

        frame: false,
        transparent: true,

        resizable: false,

        icon: path.resolve('./src/assets/icons/icon.png'),

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    windows.main.loadFile(path.resolve('./src/app/index.html'));

    windows.main.once('ready-to-show', () => {
        windows.main.show();
        visible = true;
    });

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

        if(store.get('quit')) {
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

app.whenReady().then(() => {
    SCREEN = screen.getPrimaryDisplay().workAreaSize;

    tray = new Tray(path.resolve('./src/assets/icons/icon.png'));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
            type: 'normal',
            click: () => {
                if(!visible) {
                    init();
                } else if(!!windows.main) {
                    windows.main.focus();
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

app.on('window-all-closed', () => {
    visible = false;
});

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