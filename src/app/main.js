const {ipcRenderer} = require('electron');

window.addEventListener('load', () => {
    let sd = () => {
        if(document.querySelector('.data').value.length > 0) {
            ipcRenderer.send('update');
        }
    };

    document.querySelector('.close').addEventListener('click', () => {
        ipcRenderer.send('close');
    });

    document.querySelector('.cog').addEventListener('click', () => {
        ipcRenderer.send('settings');
    });

    document.addEventListener('keydown', e => {
        if(e.key === 'Enter') {
            sd();
        }
    });

    document.querySelector('.submit').addEventListener('click', () => {
        sd();
    });

    document.querySelector('.data').focus();

    document.querySelector('.data').addEventListener('change', () => {
        let data = document.querySelector('.data').value;

        if(data.length > 0) {
            ipcRenderer.send('item', data);
        }
    });

    ipcRenderer.on('disable', () => {
        let cl = document.querySelector('.app')?.classList;

        if(!cl.contains('disable')) {
            cl.add('disable');
        }
    });

    ipcRenderer.on('enable', () => {
        let cl = document.querySelector('.app')?.classList;

        if(cl.contains('disable')) {
            cl.remove('disable');
        }
    });

    ipcRenderer.on('items', (channel, items) => {
        document.querySelector('input.data').value = items.toString();
    });
});