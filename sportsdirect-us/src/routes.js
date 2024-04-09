const Apify = require('apify');

const { utils: { log } } = Apify;
const extractor = require('./extractor')

exports.handleStart = async ({ request, page }) => {
    // Handle Start URLs
};

exports.LIST = async ({ request, page }, { requestQueue }) => {

    const { pages } = global;
    const { pageNum } = request.userData;

    log.info(`CRAWLER -- LIST ${request.url}`)

    const URLBASE = 'https://us.sportsdirect.com'

    product_list = await page.$$eval('.s-productthumbbox', node => node.map(element => element.querySelector('a').getAttribute('href')))

    for (let link of product_list) {

        let url = `${URLBASE}${link}`

        await requestQueue.addRequest({
            url,
            userData: { label: 'DETAIL' }
        })
    }

    if (await page.$('.swipeNextClick.NextLink')) {

        let nextPage    = await page.$eval('.swipeNextClick.NextLink', link => link.getAttribute('href'))
        let url         = `${URLBASE}${nextPage}`

        if (pages && pages.split('-').length > 1) {

            const [minPage, maxPage] = pages.split('-');

            if (pageNum < parseInt(maxPage, 10)) {

                const currentPage = pageNum + 1;

                await requestQueue.addRequest({
                    url,
                    userData: {
                        label: 'LIST',
                        pageNum: currentPage
                    },
                });

            }
        } else if (pages.includes('auto') || pages.includes('AUTO')) {
            const currentPage = pageNum + 1;
            await requestQueue.addRequest({
                url,
                userData: {
                    label: 'LIST',
                    pageNum: currentPage
                },
            });
        }
    }
};

exports.DETAIL = async ({ request, page }) => {

    log.info(`CRAWLER -- DETAIL ${request.url}`)

    const item = await extractor.getProduct(page)

    async function availability (opts) {

        for (let opt of opts) {

            const selectSizeElement = await page.$(`#ulSizes #liItem[data-text="${opt.Size}"]`)
            const selectColorElement = await page.$(`#ulColourImages li[data-text="${opt.Colour}"]`)

            if (selectColorElement) {
                await selectColorElement.click()
            }

            if (selectSizeElement) {
                const selectColorAvailability = await selectSizeElement.evaluate((node) => node?.getAttribute('title'))
                opt.Availability = selectColorAvailability?.includes("out of stock") ? false : true
            }
        }
    }
    await availability(item.ItemOptionData)

    item.ItemStatus = item.ItemOptionData?.[0]['Availability'] ? "On Sale" : "Sold Out"
    item.ItemQty = item.ItemStatus?.includes("On Sale") ? "20" : "0"

    await Apify.pushData({...item})
};
