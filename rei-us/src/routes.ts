import { Dataset, createPlaywrightRouter, RequestOptions, RequestQueue } from 'crawlee';

export const router = createPlaywrightRouter();
const requestQueue = await RequestQueue.open();

interface Item {
    ItemUrl: string,
    ItemCode: string,
    ItemTitle: string,
    BrandName: string,
    ItemPrice: string,
    ItemRetailPrice: string,
    ItemOption: string,
    ItemOptionData: any,
    ItemQty: string,
    ItemStatus: string,
    ShippingInfo: string,
    ItemDescription: string,
    StandardImage: string,
    OtherImages: (string| null)[],
    ItemOrigin: string,
    ItemWeight: string,
    ItemSize: string,
    ItemExpiredate: string,
    ISBNCode: string,
    UPCCode: string,
    ItemMFGdate: string,
    ItemModelNo: string,
    ItemMaterial: string,
    Memo: string,
    Category: string
}

router.addDefaultHandler(async ({ log }) => {
    log.info(`Handle Start URLs`);
});

router.addHandler('handleList', async ({ page, request, log }) => {
    
    const { pages } = request.userData;

    log.info(`Handle pagination ${request.loadedUrl}`);
    
    const product_urls = async () => {
        let links = await page.$$("#search-results ul li a")
        let data: string[] = []
        
        for (let link of links) {
            let url = await link.evaluate((node) => node.getAttribute('href'))
            if (url?.includes("/product/")) {
                data.push(`https://www.rei.com${url}`)
            }
        }
        
        return data
    }
    const make_request = async () => {
        const data = await product_urls()
        log.info(`Total items ${data.length}`)
        for (let url of data) {
            let req: RequestOptions = { url, label: 'handleDetail' }
            await requestQueue.addRequest(req)
        }
    }
    const get_next_page = async () => {

        const nextElement = await page.$$("nav a span")
        let next_page_url:any = null

        for (let s of nextElement) {
            let elementText = await s.textContent()

            if (elementText?.includes("Go to next page")) {
                let current_url = new URL(request?.url)
                let pageNum = Number(current_url.searchParams.get("page"))
                pageNum = (pageNum === 0) ? 1 : pageNum

                let sequential = pages?.split("-")
                
                if (pages.includes("AUTO") || pages.includes("auto")) {
                    current_url.searchParams.set("page", `${pageNum + 1}`)
                    next_page_url = current_url.toString()
                } else {
                    let [min, max] = sequential
                    if (pageNum < parseInt(max, 10)) {
                        current_url.searchParams.set("page", `${pageNum + 1}`)
                        next_page_url = current_url.toString()
                    }
                }
            }
        }
        return next_page_url
    }
    const handle_navigation = async () => {

        await make_request()

        const url = await get_next_page()
        
        if (url) {
            let req: RequestOptions = { url, label: 'handleList', userData: { pages } }
            await requestQueue.addRequest(req)
        }
    }
    await handle_navigation()
});

router.addHandler('handleDetail', async ({ request, page, log }) => {
    
    const title = await page.title();
    
    log.info(`Handle details: ${title} [${request.loadedUrl}]`);

    async function productCode () {
        let sku:any = ""

        if (await page.$('#product-item-number') !== null) {
            sku = await page.$eval('#product-item-number', code => code?.textContent?.match(/[0-9]+/)?.[0])
        } else {
            sku = request.loadedUrl?.match(/[0-9]+/)?.[0]
        }
        return sku
    }
    async function productPrice() {
        let primary_price_element = await page.$("buy-box-product-price")
        let secondary_price_element = await page.$(".compare-price__display")
        let price:any = ""

        if (primary_price_element !== null) {
            price = await primary_price_element.evaluate((node) => node.textContent?.match(/[0-9]+.[0-9]+/)?.[0])
        } else if (secondary_price_element !== null) {
            price = await secondary_price_element.evaluate((node) => node.textContent?.match(/[0-9]+.[0-9]+/)?.[0])
        }
        return price
    }
    async function productRetailPrice () {
        let primary_price_element = await page.$('.price-range')
        let secondary_price_element = await page.$('.compare-price__compare')
        let retail:any = ""

        if (primary_price_element) {
            retail = await primary_price_element.evaluate((node) => node?.textContent?.match(/[0-9]+.[0-9]+/)?.[0])
        } else if (secondary_price_element) {
            retail = await secondary_price_element.evaluate((node) => node?.textContent?.match(/[0-9]+.[0-9]+/)?.[0])
        }
        return retail
    }
    async function productStatus() {
        let primary_btn_element = await page.$("#add-to-cart-button")
        let secondary_btn_element = await page.$("span[data-ui='add-to-cart-btn']")

        let status:any = ""

        if (primary_btn_element) {
            status = await primary_btn_element.evaluate(status => status?.textContent)
        } else if (secondary_btn_element) {
            status = await secondary_btn_element.evaluate(status => status?.textContent)
        }
        return status?.includes("Add to cart") ? "On Sale" : "Sold Out"
    }
    async function Qty() {
        let status = await productStatus()
        return status?.includes("On Sale") ? "20" :"0"
    }

    async function productBrand () {
        
        let primary_brand_element = await page.$("#product-brand-link")
        let secondary_brand_element = await page.$(".main-product-details-header__brand")
        let brand: any = ""
        
        if (primary_brand_element) {
            brand = await primary_brand_element.evaluate((node) => node?.textContent?.trim())
        } else {
            brand = await secondary_brand_element?.evaluate((node) => node?.textContent?.trim())
        }
        return brand
    }

    async function productTitle () {
        let brand = await productBrand()
        let primary_title = await page.$("#product-page-title")
        let secondary_title = await page.$("span[itemprop='name']")

        let title:any = ""

        if (primary_title) {
            title = primary_title.evaluate((node) => node.textContent?.trim())
        } else {
            title = `${brand} ${await secondary_title?.evaluate((node) => node.textContent?.trim())}`
        }

        return title
    }

    async function productStandardImg () {

        let path = ""
        let img:any = ""

        if (await page.$(".color-btn--selected") != null) {
            let default_option = await page.$(".color-btn--selected")
            await default_option?.click()
        }

        let primary_img_element = await page.$("#media-center-primary-image")
        let secondary_img_element = await page.$(".ui-slideshow-slide__image")

        if (primary_img_element) {
            img = await primary_img_element.evaluate(img => img.getAttribute("src"))
        } else if (secondary_img_element) {
            img = await secondary_img_element.evaluate(img => img.getAttribute("src"))
        }

        path = (img?.match(/(https?|http)/) == null) ? `https://rei.com${img}` : img

        return path
    }
    async function productOption () {
        let obj:any = {}
        if (await page.$("#color-selector-wrapper-label") != null) {
            let colors = await page.$$eval('button.color-btn', nodes => nodes.map((btn) => btn.getAttribute('data-color')) )
            obj['Color'] = colors.join()
        }
        if (await page.$('fieldset[aria-labelledby="size-selector-label"]') != null) {
            let sizes = await page.$$eval("button.size-selector__size-button", nodes => nodes.map((btn) => btn.querySelector('span')?.textContent?.trim()))
            obj['Size'] = sizes.join().replace(/[\n|\t]/gm, "")
        }
        if (await page.$$("input[name='size']") != null) {
            let sizes = await page.$$eval("input[name='size']", nodes => nodes.map((btn) => btn.getAttribute('value')))
            obj['Size'] = sizes.join().replace(/[\n|\t]/gm, "")
        }
        if (await page.$$("input[name='color']") != null) {
            let colors = await page.$$eval(".color-selector__image", nodes => nodes.map((btn) => btn.getAttribute('alt')))
            obj['Color'] = colors.join()
        }
        return obj
    }

    async function productOtherImgs() {

        let primary_element = await page.$(".ui-slideshow-navigation__thumbnail-control-list-item")

        let detailImgs: any = []
        let secondaryImgs: any = []
        let main = await productStandardImg()
        let main_code = main?.split("media/")?.[1]

        const get_imagen_details = async () => {

            let data = []

            if (await page.$$(".media-center-carousel--hide-scrollbar") != null) {

                let default_option = await page.$(".color-btn--selected")
                await default_option?.click()
    
                let btns = await page.$$(".media-center-carousel--hide-scrollbar button")            
                
                for ( let btn of btns) {
                    
                    await btn.click()
                    
                    let img = await page.$eval("img#media-center-primary-image", img => img.getAttribute("src"))
                    
                    if (img?.match(/(https?|http)/) == null) {
                        
                        let path = `https://rei.com${img}`
                        
                        if (!path?.match(main_code)) {
                            data.push(`https://rei.com${img}`)
                        }
                    }
                }
            }
            return data.slice(1)
        }

        const get_other_images = async () => {

            let data = []

            if (await page.$$('button.color-btn') != null) {

                let btnImgs = await page.$$("button.color-btn")
    
                for (let btn of btnImgs) {
    
                    await btn.click()
                    let img = await page.$eval("img#media-center-primary-image", img => img.getAttribute("src"))
                    
                    if (img?.match(/(https?|http)/) == null) {

                        let path = `https://rei.com${img}`

                        if (!path.includes(main_code)) {
                            data.push(path)              
                        }
                    }
                }
            }
            return data
        }

        const primary_imagen_detail = async () => {
            let imgs = await page.$$eval("img[data-ui='product-control-image']", nodes => nodes.map((i) => i.getAttribute('src')))
            return imgs.slice(1)
        }

        if (primary_element) {
            detailImgs = await primary_imagen_detail()
        } else {
            detailImgs = await get_imagen_details()
            secondaryImgs = await get_other_images()
        }

        return [...detailImgs, ...secondaryImgs]
    }
    async function Categories () {
        
        let categories:any = ""
        let primary_element = await page.$$(".product-showcase__breadcrumbs li")
        
        if (primary_element) {
            categories = await page.$$eval(".product-showcase__breadcrumbs li", nodes => nodes.map((element) => element?.textContent?.split(">")?.[0]))
        } else {
            categories = await page.$$eval("nav[aria-label='breadcrumbs'] ol li", nodes => nodes.map((element) => element?.textContent?.split("/")?.[0]))
        }

        return categories.slice(1).join().replace(/,/gm, " / ")
    }
    async function Description () {

        let html:string = ""
        let secondary_element = await page.$("#product-details-panel")

        if (secondary_element) {
            let description_element = await secondary_element.evaluate((node) => {
                Array.from(node.querySelectorAll('a')).map(a => a?.remove())
                return node.innerHTML
            })

            html = description_element?.replace(/[\t|\n]/gm, "")
            html = html.replace(/\"/gm, "'")
        } else {

            let description:any = await page.evaluate(() => {

                // Selected data description
                let data = []
                let section = ["#product-primary-description", "#product-featured-specs", "#features-accordion", "#tech-specs-accordion"]
                
                for (let s of section) {
                    Array.from(document.querySelectorAll(`${s} a`)).map((a) => a.remove())
                    data.push(document.querySelector(s)?.innerHTML)
                }
                
                return data
            })
    
            html = description?.join().replace(/[\t|\n]/gm, "")
            html = html.replace(/\"/gm, "'")
        }

        return html
    }
    async function handleItemOption () {

        let colorElements= await page.$$("button.color-btn")
        let secondaryColorElement = await page.$$("input[name='color']")
        let itemOptions:any = []

        if (secondaryColorElement) {
            for (let btn of secondaryColorElement) {
                await btn.click()
                const data = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('input[name="size"]')).map((element:any) => {
                        let obj = {
                            Price: document.querySelector(".compare-price__display")?.textContent?.match(/[0-9]+.[0-9]+/)?.[0],
                            Size: element.getAttribute("value"),
                            Color: document.querySelector('.atc-form-control-header__active-label')?.textContent?.trim(),
                            Availability: document.querySelector("span[data-ui='add-to-cart-btn']")?.textContent?.includes("Add to cart") ? true : false
                        }
                        return obj
                    })
                })
                itemOptions = [...itemOptions, ...data]
            }
        } else {

            for (let btn of colorElements) {
                await btn.click()
    
                const data = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('.size-selector__size-button')).map((element:any) => {
                        let obj = {
                            price: document.querySelector("#buy-box-product-price")?.textContent?.match(/[0-9]+.[0-9]+/)?.[0],
                            size: element.querySelector("span")?.textContent.trim(),
                            color: document.querySelector(".color-btn.color-btn--selected")?.getAttribute('data-color'),
                            availability: element.getAttribute("class").includes("unavailable") ? false : true
                        }
                        return obj
                    })
                })
                itemOptions = [...itemOptions, ...data]
            }
        }
        return itemOptions
    }
    async function itemWeight () {

        let weight: any = ""

        // await page.waitForSelector("#tech-specs-accordion .tech-specs__value")

        let control_element = await page.$("button[aria-controls='technical-specs-panel']")

        if (control_element) {
            await control_element.click()
            weight = page.evaluate(() => {
                let content_element =Array.from(document.querySelectorAll('td')).filter(a => a?.textContent?.match(/[0-9]+ lb. [0-9]+.[0-9]+ oz./))
                let value:any = content_element[0]?.textContent
                return value.trim()
            })
        } else {

            let data = await page.$$("#tech-specs-accordion .tech-specs__value")
        
            for (let element of data) {
                let value = await element.evaluate((node) => node.textContent)
                if (value?.match(/[0-9]+ lb. [0-9]+.[0-9]+ oz./)) {
                    weight = value.trim()
                } 
            }
        }
        return weight
    }

    let item : Item = {
        ItemUrl: request.loadedUrl || "",
        ItemTitle: await productTitle() || "",
        BrandName: await productBrand() || "",
        ItemCode: await productCode() || "",
        ItemPrice: await productPrice() || "",
        ItemRetailPrice: await productRetailPrice() || await productPrice() || "",
        ItemStatus: await productStatus() || "",
        ItemQty: await Qty() || "",
        ShippingInfo: "",
        ItemOption: await productOption() || "",
        ItemOptionData: await handleItemOption() || "",
        StandardImage: await productStandardImg() || "",
        OtherImages: await productOtherImgs() || [],
        ItemDescription: await Description() || "",
        UPCCode: "",
        ISBNCode: "",
        ItemExpiredate: "",
        ItemMaterial: "",
        ItemModelNo: "",
        ItemMFGdate: "",
        ItemOrigin: "",
        ItemSize: "",
        ItemWeight: await itemWeight() || "",
        Memo: "",
        Category: await Categories() || ""
    }
    await Dataset.pushData({ ...item });

});
