const Store = require('electron-store');

const { DEFAULT_INTERVAL } = require('./constants');
const store = new Store();

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