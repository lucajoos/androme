const { app } = require('electron');

const r = {
    restart: () => {
        app.relaunch();
        app.exit();
    },

    reset: () => {
        require('./store').reset();
        r.restart();
    },
};


module.exports = r;