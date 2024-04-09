const { Apify } = require("apify");

const getProduct = async (page) => page.evaluate(async () => {

    const cartesian = (sets) => sets.reduce((acc, set) => acc.flatMap((x) => set.map((y) => [...x, y])), [[]]);

    const getImages = async () => {

        let standarImage        = document.querySelector("#imgProduct_1") ? document.querySelector("#imgProduct_1")?.getAttribute("src") : ""
        let standarImageDetail  = document.querySelectorAll('.innerImageContainer img') ? Array.from(document.querySelectorAll('.innerImageContainer img')).map((img) => img?.getAttribute('src')) : ""
        let secondaryImages = Array.from(document.querySelectorAll('#ulColourImages img')).map((img) => img.getAttribute("src")?.replace("_bs", "_l"))

        standarImageDetail = Array.from(standarImageDetail).filter(img => img).slice(1)
        secondaryImages = secondaryImages.slice(1)

        let otherImages = [...standarImageDetail ,...secondaryImages]

        return [standarImage, otherImages]
    }

    async function getDescription () {

        if (document.querySelector('.productDescriptionInfoText a')) {
            Array.from(document.querySelector('.productDescriptionInfoText a')).map((a) => a.remove())
        }
        let html = document.querySelector('.productDescriptionInfoText')?.innerHTML
        let html_new_format = html.replace(/[\n|\t]/gm, "")
        html_new_format = html_new_format.trim().replace(/\"/gm, "'")

        return html_new_format
    }

    item = {}

    item.ItemUrl            = document.URL

    item.ItemCode           = document.querySelector('#lblProductCode') ? document.querySelector('#lblProductCode')?.innerText?.match(/[0-9]+/)?.[0] : "";

    BrandName               = document.querySelector('span#lblProductBrand') ? document.querySelector('span#lblProductBrand')?.innerText : "";
    item.BrandName          = BrandName

    item.ItemTitle          = document.querySelector('span#lblProductName') ? `${BrandName} ${document.querySelector('span#lblProductName').innerText}` : "";
    item.ItemPrice          = document.querySelector('#lblSellingPrice') ? document.querySelector('#lblSellingPrice').innerText.match(/[0-9]+.[0-9]+/)?.[0] : "";
    item.ItemRetailPrice    = document.querySelector('#lblTicketPrice') ? document.querySelector('#lblTicketPrice').innerText.match(/[0-9]+.[0-9]+/)?.[0] : item.ItemPrice;

    item.ItemRetailPrice    = (parseInt(item.ItemRetailPrice) == 0.00) ? item.ItemPrice : item.ItemRetailPrice

    item.ItemStatus         = "";
    item.ItemQty            = "";

    item.ShippingInfo       = "";

    arrImg                  = await getImages();

    item.StandardImage      = arrImg[0]
    item.OtherImages        = arrImg[1]

    item.ItemDescription    = await getDescription()

    ItemOption              = {};

    if (document.querySelector('#ulColourImages') != null) {
        ItemOption.Colour = Array.from(document.querySelectorAll('#ulColourImages li')).map((li) => li.getAttribute('data-text')).join()
    } else if (document.querySelector('span#colourName') != null) {
        ItemOption.Colour = document.querySelector('span#colourName')?.textContent.trim()
    }
    if (document.querySelector('#ulSizes') != null) {
        ItemOption.Size = Array.from(document.querySelectorAll('#ulSizes li')).map((li) => li.getAttribute('data-text')).join()
    }

    item.ItemOption         = ItemOption;

    itemOptionValues = []

    if (Object.keys(ItemOption)) {

        for (key of Object.keys(ItemOption)) {

            let values = ItemOption[key]?.split(",")

            itemOptionValues = [...itemOptionValues, values]

        }
        itemOptionData = cartesian(itemOptionValues)

        item.ItemOptionData = Array.from(itemOptionData).map((pairs) => {
            let keys = Object.keys(ItemOption)

            let model = {}

            for (let i = 0; i < pairs.length; ++i) {
                model[keys[i]]          = pairs[i]
                model['Availability']   = true
                model['Price']          = item.ItemPrice
            }
            return model
        })
    }

    item.ItemOrigin         = "";
    item.ItemWeight         = "";
    item.ItemSize           = "";
    item.ItemExpiredate     = "";
    item.ISBNCode           = "";
    item.UPCCode            = "";
    item.ItemMFGdate        = "";
    item.ItemModelNo        = "";
    item.ItemMaterial       = "";
    item.Memo               = "";
    item.Category           = document.querySelectorAll('.s-breadcrumbs-bar li') ? Array.from(document.querySelectorAll('.s-breadcrumbs-bar li')).map(li => li.innerText).slice(1).join().replaceAll(",", " / ") : "";

    return item
})

module.exports = {
    getProduct
}
