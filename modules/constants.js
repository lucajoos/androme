const { app } = require('electron');
const path = require('path');

module.exports = {
    DEFAULT_INTERVAL: 1800000,
    RESOURCES: {
        API: app.isPackaged ? path.join(process.resourcesPath, './api.js') : path.resolve('./resources/api.js'),
        ICON: app.isPackaged ? path.join(process.resourcesPath, './icon.png') : path.resolve('./resources/icon.png')
    }
}