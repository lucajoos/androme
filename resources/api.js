module.exports = ({ apis, query }) => {
    return new Promise((resolve, reject) => {
        const si = query.split(',');

        apis.unsplash.photos.getRandom({
            query: si[Math.floor(Math.random() * si.length)] || 'scenery'
        }).then(response => {
            if(response.errors) {
                reject(response.errors);
            } else {
                resolve(response.response.urls.raw);
            }
        });
    });
}