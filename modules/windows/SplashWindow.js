const { BrowserWindow } = require('electron');

module.exports = ({ store, windows }, callback) => {
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

            if(typeof callback === 'function') {
                callback();
            }
        });
    }
}