import { Dataset, RequestQueue, RequestOptions, createPlaywrightRouter } from 'crawlee';

interface Item {
    ItemURL: string,
    ItemCode: string,
    ItemTitle: string,
    ReviewCount: string,
    PurchaseCount: string,
    TotalReviewRating: string,
    ReviewFullmarks: string,
    ReviewData: string[]
}
export const router = createPlaywrightRouter();
const requestQueue = await RequestQueue.open();
const non_duplicated:any = new Set();

router.addDefaultHandler(async ({ enqueueLinks, log }) => {
    log.info(`Handle Start URLs`);
    await enqueueLinks({
        globs: ['https://crawlee.dev/*'],
        label: 'DETAIL',
    });
});

router.addHandler('handleList', async ({ request, page, log }) => {

    const { pages } = request.userData;

    log.info(`CRAWLER -- FETCHING PAGE ${pages} ${request.url}`);

    async function get_products () {

        let items = await page.$$eval('.item a.anchor', nodes => nodes.map((a) => {
            
            let reviews:any = a.querySelector('.grade_average_score')?.textContent
            let link = null

            if (parseFloat(reviews) >= 1) {
                link = a.getAttribute('href')
            }
            return link
        
        }))
        
        for (let url of items) {
            
            if (url) {

                let req: RequestOptions = { url, label: 'handleDetail' }
                await requestQueue.addRequest(req)

            }
        }
    }

    await get_products()

    let nextPageElement = await page.$eval('.search_pagination_button.next', link => link?.hasAttribute('disabled'))

    if (!nextPageElement) {
        
        let nextPage = pages + 1

        let new_page:any = new URL(request.url)

        new_page.searchParams.set("page", nextPage.toString())

        let req: RequestOptions = { url: new_page.toString(), label: 'handleList', userData: { pages: nextPage } }

        await requestQueue.addRequest(req)
    }

});

router.addHandler('handleDetail', async ({ request, page, log }) => {
    
    const title = await page.title();
    
    log.info(`Handle details: ${title} [${request.loadedUrl}]`);

    const tab = await page.$('a[data-tab-id="review"]')
    
    if (tab) {
        await tab.click()
    }

    const get_reviews = async () => {
        
        await page.waitForSelector('.review_block')

        const reviews = await page.$$eval('.review_block_item', reviews => reviews.map((element:any) => {

            Array.from(element.querySelectorAll('.type_bar_item span')).map((dfn:any) => dfn.remove())

            let bar_list = element.querySelectorAll('.type_bar_item')

            return {
                ReviewerName: bar_list[0]?.textContent || "",
                ReviewDt: bar_list[1]?.textContent?.trim() || "",
                ReviewRating: element.querySelector('.star_progress_bar').textContent?.match(/[0-9]+/)?.[0] || "",
                ReviewOption: element.querySelector('.button_list_box .button_list .text')?.textContent || "",
                ReviewContent: element.querySelector('.review_block_text .review_text')?.textContent?.replace(/[\t|\n|\t\n|\n\t]/gm, "") || ""
            }
        }))
        return reviews
    }

    let review_data:any = await get_reviews()

    let item: Item = {
        ItemURL: request.loadedUrl || "",
        ItemCode: await page.$eval('.deal_tag_num', code => code.textContent?.match(/[0-9]+/)?.[0]) || "",
        ItemTitle: await page.$eval('.deal_title_main', title => title.textContent?.trim()) || "",
        ReviewCount: await page.$eval('a .number', count => count.textContent) || "",
        PurchaseCount: await page.$eval('.deal_price_buy_count .number_unit', purchase => purchase.textContent?.match(/[0-9]+/)?.[0]) || "",
        TotalReviewRating: await page.$eval('.button_review_average .grade_average .grade_average_score', score => score.textContent) || "",
        ReviewFullmarks: "5",
        ReviewData: review_data || []
    }
    if (!non_duplicated.has(item.ItemCode)) {
        non_duplicated.add(item.ItemCode)
        await Dataset.pushData({ ... item });
    }
});
