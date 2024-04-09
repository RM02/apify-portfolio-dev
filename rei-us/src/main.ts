// For more information, see https://crawlee.dev/
import { Actor } from 'apify';
import { KeyValueStore, PlaywrightCrawler, RequestQueue, RequestOptions, log } from 'crawlee';
import { router } from './routes.js';

await Actor.init()
interface InputSchema {
    startUrls: string[];
    categoriesUrls: string[];
    detailUrls: string[];
    keyword: string,
    pages: string,
    debug?: boolean;
}

const requestQueue = await RequestQueue.open();

const { startUrls, categoriesUrls, keyword, pages, detailUrls, debug } = await KeyValueStore.getInput<InputSchema>() ?? {};


const handleRequest = async (url:string, label:string) => {
   
    let req: RequestOptions = { url, label, userData: { pages } }
    await requestQueue.addRequest(req)

}
const setPageParam = async (_url:string) => {
    let url = new URL(_url)    
    if (pages?.match(/[0-9]+/)) {
        let min = pages?.split("-")?.[0]
        url.searchParams.set("page", `${min}`)
    } else {
        url.searchParams.set("page", "1")
    }
    return url.toString()

}

if (debug) {
    log.setLevel(log.LEVELS.DEBUG);
}
if (startUrls) {
    for (let url of startUrls) {
        
        if (url) {
            url = await setPageParam(url)
            await handleRequest(url, "handleList")
        }
    }  
}
if (categoriesUrls) {
    for (let url of categoriesUrls) {
        
        if (url) {
            url = await setPageParam(url)
            await handleRequest(url, "handleList")
        }
    }  
}
if (detailUrls) {
    for (let url of detailUrls) {
        if (url) {
            await handleRequest(url, "handleDetail")
        }
    }
}
if (keyword) {
    let url = `https://www.rei.com/search?q=${encodeURIComponent(keyword)}`
    url = await setPageParam(url)
    await handleRequest(url, "handleList")
}

const crawler = new PlaywrightCrawler({
    requestQueue,
    headless: true,
    navigationTimeoutSecs: 500,
    requestHandlerTimeoutSecs: 500,
    maxConcurrency: 10,
    requestHandler: router,
});

await crawler.run();
await Actor.exit()