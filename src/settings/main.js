const { ipcRenderer } = require('electron');
const Store = require('electron-store');

const store = new Store();

window.addEventListener('load', () => {
    if(!store.get('auto-update')) {
        document.querySelector('.data-auto').removeAttribute('checked');
    }

    if(!!store.get('quit')) {
        document.querySelector('.data-quit').setAttribute('checked', 'true');
    }

    if(!!store.get('beta')) {
        document.querySelector('.data-beta').setAttribute('checked', 'true');
    }

    document.querySelector('.data-interval').setAttribute('value', (parseInt(store.get('interval')) / 60 / 1000).toString());

    document.querySelector('.data-auto').addEventListener('input', () => {
        store.set('auto-update', document.querySelector('.data-auto').checked);
    });

    document.querySelector('.data-quit').addEventListener('input', () => {
        store.set('quit', document.querySelector('.data-quit').checked);
    });

    document.querySelector('.data-beta').addEventListener('input', () => {
        store.set('beta', document.querySelector('.data-beta').checked);

        setTimeout(() => {
            ipcRenderer.send('restart');
        }, 250);
    });

    document.querySelector('.data-interval').addEventListener('change', () => {
        if(parseInt(document.querySelector('.data-interval').value) > 0) {
            store.set('interval', parseInt(document.querySelector('.data-interval').value) * 60 * 1000);
            ipcRenderer.send('circle');
        }
    });

    document.querySelector('.close').addEventListener('click', () => {
        ipcRenderer.send('close-settings');
    });

    document.querySelector('.reset > .button').addEventListener('click', () => {
        ipcRenderer.send('reset');
    });

    document.querySelector('.button.-small').addEventListener('click', () => {
        ipcRenderer.send('quit');
    });
});

window.addEventListener('keydown', e => {
    if(e.key === 'Escape') {
        ipcRenderer.send('close-settings');
    }
});
