const getProduct = async page => page.evaluate(async() => {

    let item = {}

    item.ItemUrl = document.URL;

    item.ItemCode   = document.querySelector('.feedback-add_in_modal') ? document.querySelector('.feedback-add_in_modal').getAttribute('data-product-id') : null;

    async function getColorName() {
        let colorName = document.querySelector('label .cc-swatches__label') ? document.querySelector('label .cc-swatches__label').innerText : null
        return colorName
    }

    async function formatterImages (data) {

        return Array.from(data).map((img) => img.includes("?") ? img.split("?")[0] : img)
    }

    async function getDescription () {

        Array.from(document.querySelectorAll('.cc-tabs__tab a')).map((a) => a.remove())
        let desc = document.querySelector('.cc-tabs__tab').innerHTML.replace(/(\t\n|\t|\n)/gm, "")

        return desc.replace(/\"/gm, "`")
    }


    itemColor = await getColorName()

    item.ItemTitle = document.querySelector('h1.product-area__details__title') ? ( itemColor ? `OMIE ${document.querySelector('h1.product-area__details__title').innerText} ${itemColor}`: `OMIE ${document.querySelector('h1.product-area__details__title').innerText}`) : "";

    item.BrandName = "OMIE"

    item.ItemPrice = document.querySelector('meta[property="og:price:amount"]') ? document.querySelector('meta[property="og:price:amount"]').getAttribute('content') : "";

    item.ItemRetailPrice = document.querySelector('.was-price') ? document.querySelector('.was-price').textContent?.match('[0-9]+.[0-9]+')[0] : item.ItemPrice;

    item.ItemStatus = (document.querySelector('button[name="add"]') && document.querySelector('button[name="add"]').innerText.toUpperCase() == "ADD TO CART") ? "On Sale" : "Sold Out";

    item.ItemQty = item.ItemStatus.includes("On Sale") ? "20" : "0";

    item.ShippingInfo = "";

    ItemDescription = document.querySelector('.cc-tabs__tab') ? await getDescription(): "";

    item.ItemDescription = ItemDescription

    images = document.querySelectorAll('.swiper-wrapper .theme-img') ? Array.from(document.querySelectorAll('.carousel-wrapper .slick-track a')).map(img => `https:${img.getAttribute('href')}`) : null;

    images = await formatterImages(images)

    item.StandardImage = document.querySelector('meta[property="og:image:secure_url"]') ? document.querySelector('meta[property="og:image:secure_url"]').getAttribute('content')?.split("?")[0] : "";

    item.OtherImages    = images ? images.slice(1) : []

    item.ItemOption     = "";

    item.ItemOptionData = "";

    /* itemOption = {}

    let selectors = document.querySelectorAll('.selector-wrapper');

    for (let selector of selectors) {

        let key = selector.querySelector('label') ? selector.querySelector('label').innerText.split(':')[0] : undefined
        let values = selector.querySelectorAll('ul > li > a') ? Array.from(selector.querySelectorAll('ul > li > a')).map((a) => a.innerText).join() : undefined

        itemOption[key] = values
    }

    item.ItemOption = itemOption

    itemOptionValues = []

    if (Object.keys(itemOption).length > 0) {
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
                model['price'] = item.ItemPrice
                model['availability'] = (item.ItemStatus == 'On sale') ? true : false
            }
            return model
        })
    } */

    item.ItemOrigin = "";

    weight = Array.from(document.querySelectorAll('div.cc-tabs__tab__panel ul li')).filter(v => v.innerText.includes('Weight'))

    item.ItemWeight = weight.length > 0 ? weight[0].innerText.split(":")[1].trim() : "";

    item.ItemSize = "";

    item.ItemExpiredate = "";

    item.ISBNCode = "";

    item.UPCCode = "";

    item.ItemMFGdate = "";

    item.ItemModelNo = item.ItemCode;

    item.ItemMaterial = "";

    item.Memo = "";

    item.Category = "";

    return item

});

module.exports = {
    getProduct
}
