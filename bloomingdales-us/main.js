/**
 * This template is a production ready boilerplate for developing with `PuppeteerCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

const { Log } = require('@apify/log');
const Apify = require('apify');
const tools = require('./src/tools');

const { utils: { log } } = Apify;

Apify.main(async () => {

    log.info('PHASE -- STARTING ACTOR.');

    const {
        listingPages,
        detailUrls,
        category,
        keyword,
        pages
    } = await Apify.getInput();

    global.pages = pages;
    global.keyword = keyword;
    global.category = category;

    const requestQueue = await Apify.openRequestQueue();
    const proxyConfiguration = await Apify.createProxyConfiguration();

    const router = tools.createRouter({ requestQueue });

    if (listingPages && listingPages.length > 0) {

        for ( let { url } of listingPages ) {

            await requestQueue.addRequest({
                url,
                userData: { label: 'LIST', pageNum: 1 },
            });
        }
    }

    if (detailUrls && detailUrls.length > 0) {
        for ( let { url } of detailUrls ) {

            await requestQueue.addRequest({
                url,
                userData: { label: 'DETAIL' },
            });
        }
    }

    if (keyword && !category) {

        log.info(`CRAWLER -- FETCHING KEYWORD ${keyword}`)

        await requestQueue.addRequest({
            url: `https://www.bloomingdales.com/shop/search/Pageindex/1?keyword=${keyword.replace(/ /g, '+')}`,
            userData: { label: 'LIST', pageNum: 1 },
        });

    } else if (category) {

        await requestQueue.addRequest({
            url: `https://www.bloomingdales.com`,
            userData: { label: 'INDEX', pageNum: 1 },
        });
    }

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        proxyConfiguration,
        handlePageTimeoutSecs: 1200,
        navigationTimeoutSecs: 1200,
        maxRequestRetries: 10,
        useSessionPool: true,
        sessionPoolOptions: {
            maxPoolSize: 100
        },
        launchContext: {
            useChrome: true,
            stealth: true,
            launchOptions: {
                headless: true
            },
        },
        maxConcurrency: 50,
        handlePageFunction: async (context) => {
            const { request, response, session } = context;

            // Status code check
            const status = response.status();
            log.info(`CRAWLER -- STATUS CODE: ${status}`);
            if (status !== 200) {
                session.markBad();
                throw new Error(`We got ${status}. Retrying`);
            }
                session.markGood();
                // Redirect to route
                await router(request.userData.label, context);
        },
    });

    await crawler.run();
    log.info('CRAWLER FINISHED.');
});
