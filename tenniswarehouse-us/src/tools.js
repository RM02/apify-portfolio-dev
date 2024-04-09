const Apify = require('apify');
const routes = require('./routes');
const { utils: { log } } = Apify;

exports.createRouter = (globalContext) => {
    return async function (routeName, requestContext) {
        const route = routes[routeName];
        if (!route) throw new Error(`No route for name: ${routeName}`);
        log.debug(`Invoking route: ${routeName}`);
        return route(requestContext, globalContext);
    };
};
exports.checkInput = () => {
    const { detailUrls, listingPages, pages, keyword, category } = global.inputData;

    // Validate if input is fine
    if (listingPages) {
        log.info(`ACTOR - URL WILL BE USED. IGNORING OTHER INPUTS`);
    } else if (!keyword && !category) {
        throw new Error('Category or Keyword must be provided!');
    } else if (!pages) {
        throw new Error('Pages must be provided!');
    } else if (pages.replace(/\d|-|,/g, '').length !== 0 && pages != "auto") {
        throw new Error('Pages must be provided in correct format: 1-5 or 1,2,3,6');
    }

    log.info('ACTOR - INPUT DATA IS VALID');
};
