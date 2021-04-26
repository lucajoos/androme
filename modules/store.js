const Store = require('electron-store');
const store = new Store();

module.exports = {
    reset: () => {
        store.delete('item');
        store.delete('token');
        store.delete('interval');
        store.delete('auto-update');
        store.delete('show-splash');
        store.delete('quit');
        store.delete('beta');
    },

    get: () => {
        return store;
    }
}