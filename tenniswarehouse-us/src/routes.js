const Apify = require('apify');
const extractors = require('./extractor');

const { utils: { log } } = Apify;

exports.LIST = async ({ request, page }, { requestQueue }) => {

    const { pages } = global;

    const { pageNum } = request.userData;

    log.info(`CRAWLER --- LISTING PAGE ${pageNum}`)
    log.info(`${request.url}`)

    const productList = await extractors.getProductUrls(page);

    if (productList && productList.length > 0) {
        for (let url of productList) {
            await requestQueue.addRequest({
                url,
                userData: {
                    label: 'DETAIL'
                }
            })
        }
    }
    if (await page.$('.current.page-link.next')) {


        if (pages.split('-').length > 1) {

            const [minPage, maxPage] = pages.split('-');
            const nextPage = pageNum + 1;
            const url = request.url.replace(`opt_page=${pageNum}`, `opt_page=${nextPage}`)

            if (pageNum < parseInt(maxPage, 10)) {

                await requestQueue.addRequest({
                    url,
                    userData: {
                        label: 'LIST',
                        pageNum: nextPage
                    },
                });

            }
        }
        if (pages == 'auto') {
            const nextPage = pageNum + 1;
            const url = request.url.replace(`opt_page=${pageNum}`, `opt_page=${nextPage}`)

            await requestQueue.addRequest({
                url,
                userData: {
                    label: 'LIST',
                    pageNum: nextPage
                },
            });
        }
    }
};

exports.CATEGORY = async ({ request, page }, { requestQueue }) => {

    log.info('CRAWLER -- FETCHING CATEGORY')

    const { category } = request.userData;

    const categoryLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.collapse .left_menu-section li a')).map((a) => {
            return { url: a.getAttribute('href'), name: a.innerText }
        })
    })

    for (let { url, name } of categoryLinks) {

        if (url) {
            const listingUrl = (url.indexOf("http://") == 0 || url.indexOf("https://") == 0) ? url : `https://www.tennis-warehouse.com${url}`
            if (name.toUpperCase() === category.toUpperCase()) {

                await requestQueue.addRequest({
                    url: listingUrl,
                    userData: {
                        label: 'LIST'
                    }
                })
            }
        }
    }
};

exports.DETAIL = async ({ request, page }) => {

    log.info(`CRAWLER --- PRODUCT DETAIL ${request.url}`)

    const item = await extractors.getProduct(page);

    const currentProduct = item;
    let changeObj = currentProduct.ItemOptionData;

    if (Object.keys(changeObj).length > 0) {
        for (let i = 0; i < changeObj.length; ++i) {
            let color = changeObj[i]['Color']
            let size = changeObj[i]['Size']

            const btnColor = await page.$(`.style_ordering-style_row-cell button img[alt="${color}"]`)
            if (btnColor) {
                await page.evaluate(el => el.click(), btnColor);
            }

            if (await page.$('.style_ordering-style_row-cell button')) {
                await page.evaluate((size) => {
                    Array.from(document.querySelectorAll('.style_ordering-style_row-cell button')).map((el) => {
                        if (el && el.innerText === size) {
                            el.click()
                        }
                    })
                }, size);
            }

            const alertElement = await page.$('#order_alert')
            const priceElement = await page.$('.afterpay-full_price')

            let availability;

            if (alertElement) {
                availability = await page.evaluate((el) => el.innerText, alertElement)
            }
            changeObj[i]['Availability'] = (availability == 'Unavailable') ? false : true
            changeObj[i]['Price'] = await page.evaluate((el) => el.innerText.trim(), priceElement)

        }
        if (Object.keys(currentProduct.ItemOption).length > 0) {
            currentProduct.ItemOptionData = changeObj;
        } else {
            currentProduct.ItemOptionData = [];
        }
    }

    await Apify.pushData({ ...currentProduct })
};
