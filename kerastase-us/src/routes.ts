import { createCheerioRouter, Dataset, RequestQueue, RequestOptions } from 'crawlee';

export const router = createCheerioRouter();
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

router.addDefaultHandler(async ({ enqueueLinks, log }) => {
    log.info(`Handle Start URLs`);
    await enqueueLinks({
        globs: ['https://crawlee.dev/*'],
        label: 'DETAIL',
    });
});

router.addHandler('LIST', async ({ log, request, sendRequest }) => {
    
    log.info(`CRAWLER -- LIST ${request.loadedUrl}`)
    
    async function getAjaxRequest() {
        
        const newUrl = new URL(request.url)
        newUrl.searchParams.set("ajax", "true")
        
        const response = sendRequest({url: newUrl.href})
        return response
    }

    const { body } = await getAjaxRequest()

    if (body) {
        let data = JSON.parse(body)
        
        if (data.searchgrid) {
            let elements = data.searchgrid.elements
            for (let element of elements) {

                if (element?.pid?.['product/productdiscoverlink']?.url?.product) {
                    let url = `https://www.kerastase-usa.com${element?.pid?.['product/productdiscoverlink']?.url?.product}`

                    let req: RequestOptions = { url, label: 'DETAIL' }
                    await requestQueue.addRequest(req)
                }
            }
            if (data.paging.componentOptions.nextPageURL) {
                await requestQueue.addRequest({ url: data.paging.componentOptions.nextPageURL, label: 'LIST' })
            }
        }
    }

});

router.addHandler('DETAIL', async ({ request, $, log }) => {
    
    const title = $('title').text();
    
    log.info(`Handle details: ${title} [${request.loadedUrl}]`);

    async function itemOption() {
        let selector = $('.c-variations-carousel .c-carousel__content .c-carousel__item')

        return selector
    }
    async function processImages(data) {
        for (let section of data) {
            let imgs = $(section).parent().find('img')
            Array.from(imgs).map((img) => {
                if ($(img).attr('data-src')) {
                    let new_src = $(img).attr('data-src')
                    $(img).attr('src', new_src)
                }
            })
        }
        return data
    }
    async function getDescription () {

        Array.from($('.l-section__row a')).map((a) => $(a).remove())
        Array.from($('.l-section__row .c-video-asset')).map((v) => $(v).remove())

        let sections = ["Product Benefits", "Key Ingredients", "How to Use"]

        let descriptionsElements = Array.from($("h2.c-section__title")).filter((h:any) => $(h).text().includes(sections[0]) || $(h).text().includes(sections[1]) || $(h).text().includes(sections[2]))

        await processImages(descriptionsElements)

        let data = Array.from(descriptionsElements).map((el) => $(el).parent().html()).join().replace(/[\n|\t|\n\t]/gm, "")
        
        data = data.replace(/"/gm, "'")

        return data
    }
    async function getImages () {
        let img = Array.from($('.c-product-detail-image__image-link img')).map((img:any) => $(img).attr('src')?.split("?")[0])
        return img
    }
    async function getCategories() {
        let categories = Array.from($('.c-breadcrumbs .c-breadcrumbs__list li')).map((li) => $(li).text().trim())
        categories.pop()
        return categories?.join(" > ")
    }

    let images: any = await getImages();

    async function handleItems() {

        const optionGroup = await itemOption()

        for (let opt of optionGroup) {

            let optionGroup = $(opt)?.find('.c-variations-carousel__value').text()
            let optionGroupPrice = $(opt)?.find('.c-product-price__value.m-new').text() || $(opt)?.find('.c-product-price__value').text()
            let optionGroupRetailPrice = $(opt)?.find('.c-product-price__value.m-old').text()

            let status = $(opt)?.find('.c-variations-carousel__link')?.attr('aria-label')

            let item: Item = {
                ItemUrl: request.loadedUrl,
                ItemCode: $('main').attr('data-pid')?.toString() || "",
                BrandName: "Kerastase",
                ItemTitle: `Kerastase ${$('.c-product-main__name').text()} ${optionGroup}` || "",
                ItemPrice: optionGroupPrice.match(/[0-9]+.[0-9]+/)?.[0] || "",
                ItemRetailPrice: optionGroupRetailPrice.match(/[0-9]+.[0-9]+/)?.[0] || optionGroupPrice.match(/[0-9]+.[0-9]+/)?.[0],
                ItemQty: status?.includes("variation is out of stock") ? "0" : "20",
                ItemStatus: status?.includes("variation is out of stock") ? "Sold Out" : "On Sale",
                ShippingInfo: "",
                StandardImage: images?.[0] || "",
                ItemOption: "",
                ItemOptionData: "",
                OtherImages: images.slice(1) || [],
                ItemDescription: await getDescription() || "",
                ItemSize: "",
                ItemWeight: "",
                ItemOrigin: "",
                ItemExpiredate: "",
                ISBNCode: "",
                UPCCode: "",
                ItemMFGdate: "",
                ItemModelNo: "",
                ItemMaterial: "",
                Memo: "",
                Category: await getCategories() || ""
            }
            await Dataset.pushData({ ...item });
        }

    }
    await handleItems()
});
