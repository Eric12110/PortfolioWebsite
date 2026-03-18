document.addEventListener("DOMContentLoaded", () => {
    // 從 URL 取得綠界回傳 QueryString
    const params = new URLSearchParams(window.location.search);

    const order = {
        MerchantTradeNo: params.get("MerchantTradeNo"),
        TradeAmt: params.get("TradeAmt"),
        PaymentDate: params.get("PaymentDate"),
        PaymentType: params.get("PaymentType"),
        RtnCode: params.get("RtnCode"),  // 1=成功
        RtnMsg: params.get("RtnMsg"),
        CreatedAt: new Date().toISOString()
    };

    // 寫入 Firebase RTDB
    firebase.database().ref(`orders/${order.MerchantTradeNo}`).set(order)
        .then(() => {
            console.log("✅ 訂單已寫入 Firebase");
        })
        .catch(err => {
            console.error("❌ Firebase 寫入失敗", err);
        });
});
