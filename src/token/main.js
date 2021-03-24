const { clipboard, ipcRenderer } = require('electron');

window.addEventListener('load', () => {
    document.querySelector('a.button.paste').addEventListener('click', () => {
        ipcRenderer.send('token', clipboard.readText());
    });

    document.querySelector('a.button.cancel').addEventListener('click', () => {
        ipcRenderer.send('close-token');
    });

    document.querySelector('.close').addEventListener('click', () => {
        ipcRenderer.send('close-token');
    });
});

window.addEventListener('keydown', e => {
    if(e.key === 'Escape') {
        ipcRenderer.send('close-token');
    }
})