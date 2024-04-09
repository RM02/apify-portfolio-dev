/**
 * This template is a production ready boilerplate for developing with `PuppeteerCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

const Apify = require('apify');

const { utils: { log } } = Apify;
const tools = require('./src/tools');

Apify.main(async () => {
    const {
        listingPages,
        detailUrls,
        category,
        keyword,
        pages
    } = await Apify.getInput();

    global.pages = pages;
    const baseURL = 'https://www.tennis-warehouse.com'

    const requestQueue = await Apify.openRequestQueue();

    const router = tools.createRouter({ requestQueue });
    const proxyConfiguration = await Apify.createProxyConfiguration();

    if (listingPages && listingPages.length > 0) {
        for (let { url } of listingPages) {

            await requestQueue.addRequest({
                url,
                userData: { label: 'LIST', pageNum: 1 },
            });
        }
    }
    if (detailUrls && detailUrls.length > 0) {
        for (let { url } of detailUrls) {

            await requestQueue.addRequest({
                url,
                userData: { label: 'DETAIL' },
            });
        }
    }
    if (category) {
        await requestQueue.addRequest({
            url: baseURL,
            userData: { label: 'CATEGORY', category: category, pageNum: 1 },
        });
    }
    if (keyword) {
        const url = `https://www.tennis-warehouse.com/SearchResults/?searchtext=${encodeURIComponent(keyword)}&opt_perpage=20&opt_sort=relevance&opt_page=1`
        await requestQueue.addRequest({
            url,
            userData: { label: 'LIST', pageNum: 1 },
        });
    }

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        proxyConfiguration,
        handlePageTimeoutSecs: 200,
        navigationTimeoutSecs: 200,
        useSessionPool: true,
        sessionPoolOptions: {
            maxPoolSize: 100
        },
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

            if (status !== 200) {
                session.markBad();
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
