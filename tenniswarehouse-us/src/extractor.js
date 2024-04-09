
const getProductUrls = async page => page.evaluate(() => {

    return Array.from(
        document.querySelectorAll('.cattable-wrap-cell-info'),
    ).map(a => a.getAttribute('href'));
});

const getProduct = async page => page.evaluate(async () => {

    const cartesian = (sets) => sets.reduce((acc, set) => acc.flatMap((x) => set.map((y) => [...x, y])), [[]]);

    async function Description () {

        if (document.querySelectorAll('#product_overview a')) {
            Array.from(document.querySelectorAll('#product_overview a')).map((a) => a?.remove())
        }

        let html = document.querySelector('#product_overview') ? document.querySelector('#product_overview').innerHTML.replace(/[\n]+/gm, ' ') : ""
        html = html.replace(/\"/gm, "'")
        return html
    }

    async function Status () {

        let statusElement = document.querySelector('.style_ordering-add_cart')?.innerText
        return statusElement?.includes("Add To Cart") ? "On Sale" : "Sold Out"
    }

    const item = {}

    item.ItemUrl = document.URL;

    item.ItemTitle = document.querySelector('h1[itemprop="name"]') ? document.querySelector('h1[itemprop="name"]').innerText : "";

    item.ItemCode = document.querySelector('h1[itemprop="name"]') ? document.querySelector('h1[itemprop="name"]').getAttribute('data-code') : "";

    item.BrandName = document.querySelector('meta[itemprop="brand"]') ? document.querySelector('meta[itemprop="brand"]').getAttribute('content') : ""

    item.BrandName = (item.BrandName.length == 0) ? document.querySelector('h1[itemprop="name"]')?.innerText?.split(" ")?.[0] : item.BrandName

    item.ItemStatus = await Status();

    item.ItemQty = item.ItemStatus.includes("On Sale") ? "20" : "0";

    item.ItemPrice = document.querySelector('.afterpay-full_price') ? document.querySelector('.afterpay-full_price').innerText : "";

    item.ItemRetailPrice = document.querySelector('.list_price .is-crossout') ? document.querySelector('.list_price .is-crossout').innerText.trim().split("$")[1] : item.ItemPrice;

    item.ShippingInfo = "";

    item.ItemDescription = await Description()

    item.StandardImage = document.querySelector('.main_image') ? document.querySelector('.main_image').getAttribute('src').split("&")[0] : "";

    item.OtherImages = []

    Array.from(document.querySelectorAll('img.main_image')).map((element) => {
        item.OtherImages.push(element.getAttribute('src').split("&")[0])
    });

    item.OtherImages = item.OtherImages.slice(1);

    secondaryImages = document.querySelectorAll('.style_ordering-style_row-cell .style_ordering-image_wrap img')

    if (secondaryImages && secondaryImages.length > 0) {

        let secondaryImg = Array.from(document.querySelectorAll('.style_ordering-style_row-cell .style_ordering-image_wrap img')).map(img => img.getAttribute('srcset').split("&")[0]).slice(1)

        for (let img of secondaryImg) {
            item.OtherImages.push(img)
        }

    }
    itemOption = {}

    let options = document.querySelectorAll('.style_ordering-box .style_ordering-style_row');

    if (options) {

        Array.from(document.querySelectorAll('.style_ordering-box .section_label')).map((node) => {
            key = node.textContent.split(":")[0];
            values = []
            var nextElement = node.nextElementSibling

            if (nextElement && nextElement.nodeName === 'UL') {
                if (node.nextElementSibling.querySelectorAll("img").length > 0) {
                    values = Array.from(node.nextElementSibling.querySelectorAll("img")).map((img) => img.getAttribute('alt'));
                } else {
                    values = Array.from(node.nextElementSibling.querySelectorAll('button')).map((btn) => btn.innerText);
                }

                itemOption[`${key}`] = values.join()

            } else {

                itemOption[`${key}`] = node.querySelector('.style_ordering-label-selected').textContent;
            }
        })
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
    item.ItemOrigin = ""
    item.ItemMaterial = ""
    item.ItemSize = ""
    item.ItemExpiredate = "",
    item.ISBNCode = "",
    item.UPCCode = "",
    item.ItemMFGdate = "",
    item.ItemModelNo = "",
    item.Memo = ""
    item.Category = ""

    return item
})

module.exports = {
    getProductUrls,
    getProduct
}
