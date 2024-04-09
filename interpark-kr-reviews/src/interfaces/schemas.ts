
interface Data {
    ReviewID?: string,
    ReviewerName?: String,
    ReviewDt?: String,
    ReviewOption?: String,
    ReviewRating?: String,
    ReviewContent?: String
}
interface Item {
    ItemURL: String,
    ItemCode: String,
    ItemTitle: String,
    ReviewCount: String,
    PurchaseCount: String,
    TotalReviewRating: String,
    ReviewFullmarks: String,
    ReviewData: Data[]
}
export {
    Item
}