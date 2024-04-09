// For more information, see https://crawlee.dev/
import { Actor } from 'apify';
import { KeyValueStore, PlaywrightCrawler, RequestOptions, RequestQueue, log } from 'crawlee';
import { router } from './routes.js';

await Actor.init();
interface InputSchema {
    urls: string[];
    directUrl: string[];
    debug?: boolean;
}

const { 
    urls,
    directUrl,
    debug
} = await KeyValueStore.getInput<InputSchema>() ?? {};

const requestQueue = await RequestQueue.open();

if (debug) {
    log.setLevel(log.LEVELS.DEBUG);
}
if (urls) {
    for (let url of urls) {

        let req: RequestOptions = { url, label: 'handleList', userData: { pages: 1 } }
        await requestQueue.addRequest(req)
    }
}
if (directUrl) {
    for (let url of directUrl) {

        let req: RequestOptions = { url, label: 'handleDetail' }
        await requestQueue.addRequest(req)
    }
}

const crawler = new PlaywrightCrawler({
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    // Be nice to the websites. Remove to unleash full power.
    requestQueue,
    headless: true,
    maxConcurrency: 10,
    requestHandlerTimeoutSecs: 500,
    navigationTimeoutSecs: 500,
    requestHandler: router,
});

await crawler.run();
await Actor.exit();
