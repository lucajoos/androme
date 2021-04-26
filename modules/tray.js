const { app, Tray, Menu } = require('electron');
const { AppWindow, SettingsWindow } = require('./windows');
const { RESOURCES } = require('./constants');
const wallpaper = require('./wallpaper');

module.exports = ({ store, windows }) => {
    let tray = new Tray(RESOURCES.ICON);

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

    return tray;
}