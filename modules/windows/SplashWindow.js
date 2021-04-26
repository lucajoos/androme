const { BrowserWindow } = require('electron');
const store = require('../store').get();

let { WindowList } = require('./index');

module.exports = callback => {
    let parent = !!WindowList.AppWindow;

    if(parent) {
        WindowList.AppWindow?.webContents?.send('disable');
    }

    if(store.get('show-splash')) {
        WindowList.SplashWindow = new BrowserWindow({
            width: 500,
            height: 300,

            parent: parent ? WindowList.AppWindow : null,
            modal: !parent,

            frame: false,
            transparent: true,

            resizable: false,

            icon: './src/assets/icons/icon.png',
        });

        WindowList.SplashWindow.loadFile('./src/splash/index.html');

        WindowList.SplashWindow.once('closed', () => {
            if(parent) {
                WindowList.AppWindow?.webContents?.send('enable');
            }

            WindowList.SplashWindow = null;

            if(typeof callback === 'function') {
                callback();
            }
        });
    }
}