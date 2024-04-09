import { infiniteScroll } from '@crawlee/puppeteer/internals/utils/puppeteer_utils';
import { Dataset, RequestQueue, RequestOptions, createPuppeteerRouter } from 'crawlee';
import { Item } from './interfaces/schemas';

export const router = createPuppeteerRouter();

router.addDefaultHandler(async ({ enqueueLinks, log }) => {
    log.info(`Handle Start URLs`);
    await enqueueLinks({
        globs: ['https://crawlee.dev/*'],
        label: 'DETAIL',
    });
});

router.addHandler('handleList', async ({ page, log }) => {
    
    log.info(`Handle List`);
    
    const requestQueue = await RequestQueue.open();

    let products = []

    async function get_products() {
        
        let products = await page.$$eval('li.item a', links => links.map((a:any) => a.getAttribute('href')))
        return products
    
    }

    let total:any = await page.$eval('.sortNumber em', e => e?.textContent)
    
    let end = parseInt(total, 10)
        
    while (products.length < end) {

        products = await get_products()

        const previousHeight = await page.evaluate('document.body.scrollHeight');
    
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    
        await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            
        await page.waitForTimeout(800);

    }
    for (let url of products) {
        
        let req: RequestOptions = {
            url,
            label: 'handleDetail'
        }
        
        await requestQueue.addRequest(req)
    }
});

router.addHandler('handleDetail', async ({ request, page, log, sendRequest }) => {
    
    const itemCode = request.loadedUrl?.match(/[0-9]+/)?.[0]

    log.info(`Handle detail [${request.loadedUrl}]`);

    async function get_reviews_data(data:any) {

        let arr = data.map((element:any) => {
            return {
                ReviewerName: element['memId'],
                ReviewDt: `${element['regDtsStr'].substring(0, 4)}.${element['regDtsStr'].substring(4, 6)}.${element['regDtsStr'].substring(6, 8)}`,
                ReviewOption: "",
                ReviewRating: element['totalScore'],
                ReviewContent: element?.['productUsedWrittenDtlList']?.[0]?.['dtl']
            }
        });
        return arr
    }
    
    async function handleReviews() {

        let reviews: any = []
        
        let count = await page.$eval('.goReview span', s => s?.textContent)

        if (count == null) {
            return reviews
        }
        
        let total = (count !== null) ? parseInt(count, 10) : 0;

        if (total >= 1) {
            
            let end = (total/20) + 1;

            for (let index = 1; index <= end; index++) {
            
                const { body } = await sendRequest({ url: `https://shopapi.interpark.com/product/getProductReviewList.json?prdNo=${itemCode}&reviewInit=false&mobileYn=N&writtenTp=03&searchTp=01&rows=20&page=${index}&orderTp=02` })
                
                let content = JSON.parse(body)
        
                let items = content?.['data']?.['productReviewInfo']?.['productUsedWrittenList']
    
                reviews = [...reviews, ...await get_reviews_data(items)]
    
                if (reviews.length == total) {
                    break
                }
                
            }
        }

        return reviews
    }

    let reviewData = await handleReviews()

    let item: Item = {
        ItemURL: request.loadedUrl || '',
        ItemCode: request.loadedUrl?.match(/[0-9]+/)?.[0] || '',
        ItemTitle: await page.$eval('#productName', p => p?.textContent?.replace(/(\t\n|\t|\n)/gm, "")) || '',
        ReviewCount: await page.$eval('.goReview span', s => s?.textContent) || '',
        PurchaseCount: '',
        TotalReviewRating: await page.$eval('.ratings', s => s?.textContent) || '',
        ReviewFullmarks: '10',
        ReviewData: reviewData || []
    }
    await Dataset.pushData({ ...item });
});
