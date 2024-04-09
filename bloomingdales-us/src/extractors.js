const getProductUrls = async page => page.evaluate(() => {

    return Array.from(
        document.querySelectorAll('li div.productThumbnail'),
    ).map(el => ({
        url: el.querySelector('.productDescLink').href,
        name: el.querySelector('.productDescription').textContent,
    }));
});

const getProduct = async page => page.evaluate(async () => {

    const cartesian = (sets) => sets.reduce((acc, set) => acc.flatMap((x) => set.map((y) => [...x, y])), [[]]);

    async function get_description() {
        let html = ""
        if (document.querySelector('div[data-el="product-details"]')) {

            Array.from(document.querySelectorAll('div[data-section=product-details] a')).map((a) => a?.remove())

            Array.from(document.querySelectorAll('ul[data-auto="product-description-bullets"] li')).map((element) => {
                if (element.innerText?.match(/[0-9]/)) {
                    element.remove()
                }
            })

            html = document.querySelector('div[data-el="product-details"]')?.innerHTML?.replace(/[\"]+/g, "'")
            html = html.replace(/[\n]+/g, '')
        }
        return html
    }
    let item = {}

    item.ItemUrl = document.URL;

    item.ItemCode = document.querySelector('meta[name="photorank:tags"]') ? document.querySelector('meta[name="photorank:tags"]').content : "";

    item.ItemTitle = document.querySelector('.product-title') ? document.querySelector('.product-title').innerText.replace(/[/\s]+/g, ' ') : "";

    item.ItemStatus = (document.querySelector('button.add-to-bag') && document.querySelector('button.add-to-bag').innerText === 'ADD TO BAG') ? "On Sale" : "Sold Out";

    item.ItemQty = (item.ItemStatus == "On Sale") ? "20" : "0";

    item.ItemPrice = document.querySelector('.lowest-sale-price span') ? document.querySelector('.lowest-sale-price span')?.innerText?.match(/[0-9]+.[0-9]+/)?.[0] : "";

    item.ItemRetailPrice = document.querySelector('.c-strike') ? document.querySelector('.c-strike')?.innerText?.match(/[0-9]+.[0-9]+/)?.[0] : item.ItemPrice;

    item.BrandName = document.querySelector('.brand-name-link') ? document.querySelector('.brand-name-link').innerText : "";

    item.StandardImage = document.querySelector('.main-image.first-image picture source') ? document.querySelector('.main-image.first-image picture source').getAttribute('srcset') : ""

    item.OtherImages = []

    item.ItemDescription = await get_description()

    item.ShippingInfo = ""

    sizeOptions = document.querySelectorAll('.size-chips-list .size-chip-item')

    sizeOptionSelectElement = document.querySelectorAll('select[data-label="size"] option')

    itemOption = {}

    if (sizeOptions && sizeOptions.length > 0) {
        itemOption['size'] = Array.from(sizeOptions).map(el => el.innerText).join()
    } else if (sizeOptionSelectElement && sizeOptionSelectElement.length > 0) {
        itemOption['size'] = Array.from(sizeOptionSelectElement).slice(1).map(el => el.getAttribute('data-name')).join()
    }

    if (document.querySelectorAll('.color-swatch-container') && document.querySelectorAll('.color-swatch-container').length > 0) {
        itemOption['color'] = Array.from(document.querySelectorAll('.color-swatch')).map(el => el.getAttribute('data-color')).join()
    } else if (document.querySelector('.color-display-name')) {
        itemOption['color'] = document.querySelector('.color-display-name').innerText;
    }

    item.ItemOption = itemOption;
    itemOptionValues = []

    for (key of Object.keys(itemOption)) {

        let values = itemOption[key].split(",")

        itemOptionValues = [...itemOptionValues, values]

    }

    itemOptionData = cartesian(itemOptionValues)

    item.ItemOptionData = Array.from(itemOptionData).map((pairs) => {
        let keys = Object.keys(itemOption)

        let model = {}

        for (let i = 0; i < pairs.length; ++i) {
            model[keys[i]] = pairs[i]
        }
        return model
    })

    item.ItemWeight = ""
    ItemOrigin = ""
    ItemMaterial = ""
    item.ItemSize = ""
    item.ItemExpiredate = ""
    item.ISBNCode = ""
    item.UPCCode = ""
    item.ItemMFGdate = ""
    item.ItemModelNo = ""
    itemItemMaterial = ""
    item.Memo = ""

    item.Category = document.querySelectorAll('.breadcrumb-link') ? Array.from(document.querySelectorAll('.breadcrumb-link')).map(el => el.innerText).join(" ") : ""

    return item
})

const getCategories = async (page) => page.evaluate( async () => {

    let nav = document.querySelector('#header-category-rail-wrapper');
    let links = nav.querySelectorAll('a');

    return Array.from(links).map((el) => {
        return {
            "url": el.getAttribute('href'),
            "name": el.innerText.trim()
        }
    })

})

const getSubCategories = async (page) => page.evaluate( async () => {

    let nav = document.querySelectorAll('.category-children .link-child');
    let children = Array.from(nav).map(child => child.querySelector('a'));

    return Array.from(children).map((a) => {
        return {
            "url": a.getAttribute('href'),
            "name": a.innerText.trim()
        }
    })

})
module.exports = {
    getProductUrls,
    getProduct,
    getCategories,
    getSubCategories
}
