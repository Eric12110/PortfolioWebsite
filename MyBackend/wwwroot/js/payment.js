document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('paymentForm');
  const feedback = document.getElementById('feedback');
  const submitBtn = document.getElementById('submitBtn');
  const storedItems = JSON.parse(localStorage.getItem("checkoutItems") || "[]");
  const total = localStorage.getItem("checkoutTotal") || 0;

  // 預填
  if (storedItems.length > 0) {
    document.getElementById("description").value = `購買商品共 ${storedItems.length} 項`;
    document.getElementById("amount").value = total;
    document.getElementById("items").value = storedItems.map(i => `${i.name}x${i.quantity}`).join("#");
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    firebase.auth().onAuthStateChanged(async user => {
      if (!user) {
        Swal.fire("請先登入", "登入後才能付款", "warning");
        return;
      }

      const payload = {
        amount: document.getElementById('amount').value.trim(),
        description: document.getElementById('description').value.trim(),
        items: document.getElementById('items').value.split(/[#,]/).map(x => x.trim()).filter(Boolean)
      };

      // 建立本地訂單
      const newOrder = {
        MerchantTradeNo: `EC${Date.now()}`,
        TradeAmt: payload.amount,
        PaymentDate: new Date().toLocaleString(),
        PaymentType: "Credit",
        RtnCode: "0",
        RtnMsg: "待付款",
        Items: payload.items.join("#")
      };

      await firebase.database().ref(`orders/${user.uid}`).push(newOrder);
      firebase.database().ref(`cart/${user.uid}`).remove();
      localStorage.removeItem("checkoutItems");
      localStorage.removeItem("checkoutTotal");

      Swal.fire("成功", "訂單已建立！可前往訂單查詢頁查看。", "success")
        .then(() => window.location.href = "orders.html");
    });
  });
});
