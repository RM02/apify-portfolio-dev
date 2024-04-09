const Apify = require('apify');
const routes = require('./routes');
const extractors = require('./extractors');

const { utils: { log } } = Apify;


exports.buildURL = (baseURL, nextPage) => {
    const { pages, keyword, category } = global.inputData || {};

    const query = `Pageindex/${nextPage}?id`
    return `${baseURL.replace("?id", query)}`;
};

exports.getSources = async () => {

    const { detailUrls, listingPages, pages, keyword, category } = global.inputData || {};

    log.debug('Getting sources', detailUrls, pages, keyword, category);

    var bbaseURL = "https://www.bloomingdales.com";

    if (listingPages) {

        let listOfPages = []
        const isSequential = pages.split('-').length > 1;
        const [minPage, maxPage] = pages.split('-');

        if (isSequential) {
            for (obj of listingPages) {

                for (let index = parseInt(minPage, 10); index <= parseInt(maxPage, 10); index++) {

                    listOfPages.push({
                        url: this.buildURL(obj.url, 1),
                        userData: {
                            label: 'LIST',
                            pageNum: index,
                            baseURL: obj.url,
                        }
                    })
                }
            }
        } else {
            for (obj of listingPages) {

                listOfPages.push({
                    url: this.buildURL(obj.url, pages),
                    userData: {
                        label: 'LIST',
                        pageNum: pages,
                        baseURL: obj.url,
                    }
                })
            }
        }
        return listOfPages

    } else if (detailUrls) {

        let listOfPages = []

        for (obj of detailUrls) {
            listOfPages.push({
                url: obj.url,
                userData: {
                    label: 'DETAIL',
                    pageNum: 1,
                    baseURL: obj.url,
                }
            })
        }
        return listOfPages

    } else if (category) {
        return [
            {
                url: bbaseURL,
                userData: {
                    label: 'CATEGORIES',
                    pageNum: 1,
                    baseURL: bbaseURL
                },
            },
        ];
    }

}

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
