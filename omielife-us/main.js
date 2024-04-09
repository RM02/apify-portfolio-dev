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
        urls,
        detailUrls,
        category,
        keyword,
        pages
    } = await Apify.getInput();

    global.pages = pages;

    const baseURL = 'https://www.omielife.com'

    const requestQueue = await Apify.openRequestQueue();

    const router = tools.createRouter({ requestQueue });

    const proxyConfiguration = await Apify.createProxyConfiguration();

    if (urls && urls.length > 0) {
        for (let { url } of urls) {

            await requestQueue.addRequest({
                url,
                userData: { label: 'LIST' },
            });
        }
    }

    if (detailUrls && detailUrls.length > 0) {

        for (let { url } of detailUrls) {

            url = url.split("?")[0]

            await requestQueue.addRequest({
                url,
                userData: { label: 'GET_VARIANTS' },
            });
        }
    }
    if (keyword) {
        if (keyword.includes("all")) {
            let url = baseURL

            await requestQueue.addRequest({
                url,
                userData: {
                    label: 'MAIN'
                }
            })
        } else {
            let url = `${baseURL}/search?type=product&q=${encodeURIComponent(keyword)}`

            await requestQueue.addRequest({
                url,
                userData: {
                    label: 'LIST'
                }
            })
        }
    }

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        proxyConfiguration,
        handlePageTimeoutSecs: 150,
        navigationTimeoutSecs: 150,
        launchContext: {
            // Chrome with stealth should work for most websites.
            // If it doesn't, feel free to remove this.
            useChrome: true,
            stealth: false,
            launchOptions: {
                headless: false
            }
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
