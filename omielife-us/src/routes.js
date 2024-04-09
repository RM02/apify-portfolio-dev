const Apify = require('apify');

const { utils: { log } } = Apify;

const extractors = require('./extractor');

const all_urls = [
    // OmieGo
    { url: "https://www.omielife.com/collections/omiego-1" },
    // OmieBox
    { url: "https://www.omielife.com/products/omiebox" },
    // Accessories
    { url: "https://www.omielife.com/collections/omiepod-utensils" },
    { url: "https://www.omielife.com/products/dip-containers" },
    { url: "https://www.omielife.com/products/lunch-tote" },
    { url: "https://www.omielife.com/collections/stickers-lunch-notes" },
    { url: "https://www.omielife.com/collections/spare-parts-v1" },
    { url: "https://www.omielife.com/collections/spare-parts-v2" },
    { url: "https://www.omielife.com/collections/spare-parts-for-omiego-bento" }

]

exports.MAIN = async ({ request, page }, { requestQueue }) => {

    log.info(`CRAWLER -- ALL PAGES FROM ${request.url}`)

    for (let { url } of all_urls) {

        if (url.includes("collections")) {
            await requestQueue.addRequest({
                url,
                userData: { label: 'LIST' }
            })
        }
        else if (url.includes("products")) {
            await requestQueue.addRequest({
                url,
                userData: { label: 'GET_VARIANTS' }
            })
        }
    }
};

exports.LIST = async ({ request, page }, { requestQueue }) => {

    log.info(`CRAWLER -- LIST ${request.url}`)

    const baseURL = 'https://www.omielife.com'

    const products = await page.$$('.product-block');

    for (let product of products) {

        let link = await product.$eval('a', a => a.getAttribute('href'))
        let url = `${baseURL}${link.split("?")[0]}`

        await requestQueue.addRequest({
            url,
            userData: { label: 'GET_VARIANTS' }
        })
    }
};

exports.GET_VARIANTS = async ({ request, page }, { requestQueue }) => {

    log.info(`CRAWLER -- GETTING VARIANTS FROM ${request.url}`)

    const opts = await page.$$('.selector-wrapper ul li')

    if (opts && opts.length > 0) {

        const len = opts.length

        await opts[len-1].click()

        for (let o of opts) {

            await o.click()

            let url = await page.evaluate(() => document.URL)

            if (url) {
                await requestQueue.addRequest({
                    url,
                    userData: { label: 'DETAIL' }
                })
            }
        }
    } else {

        log.info(`CRAWLER -- DETAIL ${request.url}`)

        const item = await extractors.getProduct(page)
        await Apify.pushData({ ...item })

    }

}

exports.DETAIL = async ({ request, page }, { requestQueue }) => {

    log.info(`CRAWLER -- DETAIL ${request.url}`)

    const item = await extractors.getProduct(page)

    await Apify.pushData({ ...item })

};
