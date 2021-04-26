const AutoLaunch = require('auto-launch');

module.exports = () => {
    let launcher = new AutoLaunch({
        name: 'Androme'
    });

    launcher.isEnabled().then(enabled => {
        if(enabled) return;
        launcher.enable();
    }).catch(err => {
        throw err;
    });
}