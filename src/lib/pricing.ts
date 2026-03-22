export const DELIVERY_FEE = 30;
export const FREE_DELIVERY_THRESHOLD = 300;
export const GST_RATE = 0.05;

export type PricingOrderType = "delivery" | "pickup";

export function computeOrderPricing(
    subtotalInput: number,
    orderType: PricingOrderType,
    couponDiscount = 0,
    hasCoupon = false,
) {
    const subtotal = Math.round(subtotalInput);
    const gst = Math.round(subtotal * GST_RATE);
    const deliveryFee =
        orderType === "delivery"
            ? subtotal >= FREE_DELIVERY_THRESHOLD
                ? 0
                : DELIVERY_FEE
            : 0;
    const discountAmt = Math.round(hasCoupon ? couponDiscount : 0);
    const grandTotal = subtotal + gst + deliveryFee - discountAmt;
    const freeDeliveryUnlocked = orderType !== "delivery" || subtotal >= FREE_DELIVERY_THRESHOLD;
    const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

    return {
        subtotal,
        gst,
        deliveryFee,
        discountAmt,
        grandTotal,
        freeDeliveryUnlocked,
        remainingForFreeDelivery,
    };
}
