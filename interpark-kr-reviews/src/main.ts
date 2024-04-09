// For more information, see https://crawlee.dev/
import { Actor } from 'apify';
import { KeyValueStore, RequestOptions, PuppeteerCrawler, ProxyConfiguration, RequestQueue, log } from 'crawlee';
import { router } from './routes.js';

await Actor.init();
interface InputSchema {
    listingPages: string[];
    directUrl: string;
    debug?: boolean;
}

const { listingPages, directUrl, debug } = await KeyValueStore.getInput<InputSchema>() ?? {};

const proxyConfiguration = new ProxyConfiguration();

const requestQueue = await RequestQueue.open();

if (debug) {
    log.setLevel(log.LEVELS.DEBUG);
}
if (listingPages) {
    for (let url of listingPages) {

        let req: RequestOptions = {
            url,
            label: 'handleList'
        }
        await requestQueue.addRequest(req)
    }
}
if (directUrl) {
    let req: RequestOptions = {
        url: directUrl,
        label: 'handleDetail'
    }
    await requestQueue.addRequest(req)
}

const crawler = new PuppeteerCrawler({
    requestQueue,
    navigationTimeoutSecs: 500,
    requestHandlerTimeoutSecs: 500,
    maxConcurrency: 10,
    launchContext: {
        launchOptions: {
            headless: true
        }
    },
    requestHandler: router,
});

await crawler.run();

await Actor.exit();
