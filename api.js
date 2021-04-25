module.exports = ({ api, query }) => {
    return new Promise((resolve, reject) => {
        if(api) {
            let si = query.split(',');

            api.photos.getRandom({
                query: si[Math.floor(Math.random() * si.length)] || 'scenery'
            }).then(response => {
                if(response.errors) {
                    reject(response.errors);
                } else {
                    resolve(response.response.urls.raw)
                }

            }).catch(e => {
                reject(e);
                throw e;
            })
        }
    });
}