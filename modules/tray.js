const { app, Tray, Menu } = require('electron');

const { AppWindow, SettingsWindow } = require('./windows');
const { RESOURCES } = require('./constants');
const { reset } = require('./application');

const wallpaper = require('./wallpaper');

let WindowList = require('./windows/WindowList');

module.exports = () => {
    let tray = new Tray(RESOURCES.ICON);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
            type: 'normal',
            click: () => {
                if(!!WindowList.AppWindow) {
                    WindowList.AppWindow.focus();
                } else {
                    AppWindow();
                }
            }
        },

        {
            label: 'Update Wallpaper',
            type: 'normal',
            click: () => {
                wallpaper.update();
            }
        },

        {
            label: 'Settings',
            type: 'normal',
            click: () => {
                SettingsWindow();
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
        wallpaper.update();
    })

    return tray;
}