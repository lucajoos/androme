const fs = require('fs');
const vm = require('vm');

const wallpaper = require('wallpaper');
const fetch = require('node-fetch');

const { TokenWindow, SplashWindow } = require('./windows');
const { createApi: createUnsplashApi } = require('unsplash-js');
const { DEFAULT_INTERVAL, RESOURCES } = require('./constants');

const store = require('./store').get();

let WindowList = require('./windows/WindowList');

const r = {
    interval: null,

    update: () => {
        if(store.get('item')?.toLowerCase()?.trim()?.length > 0) {
            let api = fs.readFileSync(RESOURCES.API, {
                encoding: 'utf-8'
            });

            if(store.get('token') ? store.get('token')?.length === 0 : true) {
                TokenWindow(
                    r.update
                );
            } else if(typeof api === 'string') {
                vm.runInNewContext(api, {
                    module: {},
                    console: console
                })({
                    apis: {
                        unsplash: createUnsplashApi({
                            accessKey: store.get('token'),
                            fetch: fetch
                        })
                    },

                    query: store.get('item')?.toLowerCase()?.trim() || ''
                }).then(url => {
                    SplashWindow();

                    fetch(url.toString()).then(res => {
                        const dest = fs.createWriteStream('./fetch.png');

                        res.body?.pipe(dest);

                        dest.on('finish', () => {
                            r.change();
                        });
                    }).catch(e => {
                        console.error(e);
                        throw e;
                    });
                }).catch(error => {
                    store.set('token', '');

                    TokenWindow(
                        r.update
                    );

                    throw error;
                });
            }
        }
    },

    change: () => {
        wallpaper.set('./fetch.png').then(() => {
            if(process.platform !== 'linux') {
                try {
                    fs.unlinkSync('./fetch.png');
                } catch(e) {
                    console.error(e);
                    throw e;
                }
            }

            if(!!WindowList.SplashWindow) {
                WindowList.SplashWindow.close();
            } else {
                let parent = !!WindowList.AppWindow;

                if(parent) {
                    WindowList.AppWindow?.webContents?.send('enable');
                }
            }
        }).catch(err => {
            console.error(err);
            throw err;
        });
    },

    circle: () => {
        if(r.interval) {
            clearInterval(r.interval);
        }

        r.interval = setInterval(() => {
            if(store.get('auto-update')) {
                r.update();
            }
        }, parseInt(store.get('interval') || DEFAULT_INTERVAL.toString()));
    }
};

module.exports = r;