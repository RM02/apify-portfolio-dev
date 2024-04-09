const Apify = require('apify');
const extractors = require('./extractors');

const { utils: { log } } = Apify;

exports.INDEX = async ({ request, page }, { requestQueue }) => {
    const { pages, keyword, category } = global;
    const { pageNum } = request.userData;

    log.info(`CRAWLER -- FETCHING CATEGORY ${category}`);

    await page.waitForTimeout(100);

    const nav = await extractors.getCategories(page)

    const baseURL = "https://www.bloomingdales.com"

    for (let obj of nav) {
        const url = `${baseURL}${obj.url}`
        const match = obj.name.toLowerCase().includes(category.toLowerCase())

        if (match) {
            await requestQueue.addRequest({
                url: url,
                userData: {
                    label: 'LIST',
                    pageNum: pageNum
                }
            })
        } else {
            await requestQueue.addRequest({
                url: url,
                userData: {
                    label: 'SUBCATEGORIES',
                    pageNum: pageNum,
                    parentCategory: obj.name
                }
            })
        }
    }
};

exports.SUBCATEGORIES = async ({request, page}, {requestQueue}) => {
    const { pages, keyword, category } = global;
    const { pageNum, parentCategory } = request.userData;

    const subcategories = await extractors.getSubCategories(page)

    for (let obj of subcategories) {

        const url = obj.url
        const match = obj.name.toLowerCase().includes(category.toLowerCase())
        if (match) {
            await requestQueue.addRequest({
                url: url,
                userData: {
                    label: 'LIST',
                    pageNum: pageNum
                }
            })
        }
    }
}

exports.LIST = async ({ request, page }, { requestQueue }) => {

    const { pages, keyword, category } = global;

    const { pageNum } = request.userData;

    const baseURL = "https://www.bloomingdales.com"

    log.info(`CRAWLER -- FETCHING LIST ${request.url} with page: ${pageNum}`);

    await page.waitForTimeout(500);

    // Extract all products
    const products = await extractors.getProductUrls(page);

    if (products.length > 0) {

        for (const product of products) {

            await requestQueue.addRequest({
                url: product.url,
                userData: {
                    label: 'DETAIL',
                    product,
                },
            });

            await Apify.utils.sleep(200);
        }
    }

    if (await page.$('.paginateArrow.nextArrow')) {

        const nextElement = await page.$('.paginateArrow.nextArrow a')
        const nextPage = await page.evaluate(el => el.getAttribute('href'), nextElement)
        const url = `${baseURL}${nextPage}`

        if (pages.split('-').length > 1) {

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
        } else if (pages == 'auto') {
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

    alertElement = await page.$('a.choose-your-items')
    alertMessage = await page.evaluate((element) => element ? element.innerText.toUpperCase().includes('CHOOSE YOUR ITEMS') : null, alertElement)

    if (alertMessage === null) {
        log.info(`CRAWLER -- FETCHING DETAIL ${request.url}`);

        await page.waitForTimeout(500);

        const item = await extractors.getProduct(page);

        const currentProduct = item;

        let changeObj = currentProduct.ItemOptionData;
        let images = currentProduct.OtherImages;

        if (Object.keys(changeObj).length > 0) {

            for (let i = 0; i < changeObj.length; ++i) {

                var id = item['ItemCode']
                var color = changeObj[i]['color']
                var size = changeObj[i]['size']

                if (await page.$(`div[data-color="${color}"] .color-swatch-input`) !== null) {
                    const colorElement = await page.$(`div[data-color="${color}"] .color-swatch-input`);
                    await page.evaluate(el => el.click(), colorElement);
                }

                if (await page.$(`input[data-name="${size}"]`) !== null) {
                    const sizeElement = await page.$(`input[data-name="${size}"]`)
                    await page.evaluate(el => el.click(), sizeElement);
                } else if (await page.$(`option[data-name="${size}"]`) !== null) {
                    const sizeSelectElement = await page.$(`option[data-name="${size}"]`)
                    await page.evaluate(el => el.selected = true, sizeSelectElement);
                };

                await page.waitForTimeout(100);

                const priceElement = await page.$('.lowest-sale-price span')

                const availabilityElement = await page.$(`.shipping-option #ship-availability-message-${id}`)

                let availability;

                if (availabilityElement) {
                    availability = await page.evaluate((el) => el.innerText, availabilityElement)
                }

                changeObj[i]['availability'] = availability == 'Not available for shipping' ? false : true
                changeObj[i]['price'] = await page.evaluate((el) => el.innerText?.match(/[0-9]+.[0-9]+/)?.[0], priceElement)
            }
        }


        if (currentProduct['ItemOption']['color'] && currentProduct['ItemOption']['color'].length > 0) {

            const getSelectedImg = async (index, elementClass) => {

                const colorElement = await page.$(elementClass);

                if (colorElement && colorElement !== null) {
                    await page.evaluate(el => el.click(), colorElement);
                }

                // first imagen detail
                if (index == 0) {

                    const detailElement = await page.$$('li.alt-image input');

                    for (let element of detailElement) {
                        await page.evaluate(el => el.click(), element);
                        const imgElement = await page.$('.slick-slide.slick-current.slick-active .main-image-img');
                        await page.waitForTimeout(100);
                        const img = await page.evaluate(el => el.getAttribute('data-lazy-src'), imgElement);
                        if (img) {
                            images.push(img.split('?')?.[0])
                        }
                    }

                } else {

                    const imgElement = await page.$('.main-image.first-image picture img')

                    await page.waitForTimeout(100);

                    const img = await page.evaluate(el => el.getAttribute('src'), imgElement)
                    if (img) {
                        images.push(img.split('?')?.[0])
                    }
                }

            }

            let colors = currentProduct['ItemOption']['color'].split(",")

            for (let i = 0; i < colors.length; i++) {

                await getSelectedImg(i, `div[data-color="${colors[i]}"] .color-swatch-input`)

            }
        }

        images.slice(1)
        currentProduct.ItemOptionData = changeObj;
        currentProduct.OtherImages = images;

        await Apify.pushData({ ...currentProduct })
    } else {
        log.info(`CRAWLER -- DROPPING PRODUCT WITH GROUP OF ITEMS\n${request.url}`)
    }

};
