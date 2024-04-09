// For more information, see https://crawlee.dev/
import { Actor } from 'apify';
import { CheerioCrawler, KeyValueStore, log, ProxyConfiguration, RequestOptions, RequestQueue } from 'crawlee';
import { router } from './routes.js';

await Actor.init()

// Input requirements
interface InputSchema {
    urls: string[];
    keyword: string,
    pages: string,
    debug?: boolean;
}
const requestQueue = await RequestQueue.open();

const { 
    urls,
    keyword,
    pages = "all",
    debug
} = await KeyValueStore.getInput<InputSchema>() ?? {};

if (debug) {
    log.setLevel(log.LEVELS.DEBUG);
}
if (urls) {
    
    for (let url of urls) {
        let req: RequestOptions = { url, label: 'LIST' }
        await  requestQueue.addRequest(req)
    }
}
if (keyword && pages) {
    let url = `https://www.kerastase-usa.com/search?q=${encodeURI(keyword)}&lang=`
    let req: RequestOptions = { url, label: 'LIST' }
    await requestQueue.addRequest(req)
}

const crawler = new CheerioCrawler({
    requestQueue,
    requestHandlerTimeoutSecs: 200,
    navigationTimeoutSecs: 200,
    maxConcurrency: 10,
    requestHandler: router,
});

await crawler.run();
await Actor.exit();
