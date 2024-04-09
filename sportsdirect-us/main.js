/**
 * This template is a production ready boilerplate for developing with `PuppeteerCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

const Apify = require('apify');

const tools = require('./src/tools');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const {
        listingPages,
        itemsUrls,
        category,
        keyword,
        pages
    } = await Apify.getInput();

    global.pages = pages;

    const requestQueue = await Apify.openRequestQueue();
    const router = tools.createRouter({ requestQueue });
    const proxyConfiguration = await Apify.createProxyConfiguration({ groups: ['RESIDENTIAL'] });

    if (listingPages && listingPages.length > 0) {

        let pageNum = (pages && pages.split('-').length > 1) ? parseInt(pages.split('-')[0], 10) : 1

        for (let { url } of listingPages) {

            await requestQueue.addRequest({
                url,
                userData: { label: 'LIST', pageNum: pageNum },
            });
        }
    }
    if (itemsUrls && itemsUrls.length > 0) {
        for (let { url } of itemsUrls) {

            await requestQueue.addRequest({
                url,
                userData: { label: 'DETAIL' },
            });
        }
    }
    if (keyword && pages) {

        let url = `https://us.sportsdirect.com/searchresults?descriptionfilter=${encodeURIComponent(keyword)}`

        let pageNum = (pages && pages.split('-').length > 1) ? parseInt(pages.split('-')[0], 10) : 1

        await requestQueue.addRequest({
            url,
            userData: { label: 'LIST', pageNum: pageNum }
        })
    }
    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        proxyConfiguration,
        handlePageTimeoutSecs: 200,
        navigationTimeoutSecs: 200,
        launchContext: {
            // Chrome with stealth should work for most websites.
            // If it doesn't, feel free to remove this.
            useChrome: true,
            stealth: false,
            launchOptions: {
                headless: true
            },
        },
        browserPoolOptions: {
            // This allows browser to be more effective against anti-scraping protections.
            // If you are having performance issues try turning this off.
            useFingerprints: true,
        },
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

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');
});
