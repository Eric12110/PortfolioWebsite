document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("ordersBody");
  const searchInput = document.getElementById("search");

  const dbRef = firebase.database().ref("orders");

  // 即時監聽訂單變化
  dbRef.on("value", snapshot => {
    const data = snapshot.val() || {};
    renderTable(Object.values(data));
  });

  // 渲染表格
  function renderTable(orders) {
    const keyword = searchInput.value.trim();
    const filtered = orders.filter(o => {
      return (
        !keyword ||
        o.MerchantTradeNo?.includes(keyword) ||
        o.TradeAmt?.includes(keyword)
      );
    });

    tbody.innerHTML = filtered
      .sort((a, b) => (b.PaymentDate || "").localeCompare(a.PaymentDate || ""))
      .map(o => `
        <tr>
          <td>${o.MerchantTradeNo || '-'}</td>
          <td>${o.TradeAmt || '-'}</td>
          <td>${o.PaymentDate || '-'}</td>
          <td>${o.PaymentType || '-'}</td>
          <td>${o.RtnCode == '1'
            ? '<span class="badge bg-success">成功</span>'
            : '<span class="badge bg-warning text-dark">待付款</span>'}</td>
        </tr>
      `).join("");
  }

  // 搜尋即時過濾
  searchInput.addEventListener("input", () => {
    dbRef.once("value", snapshot => {
      const data = snapshot.val() || {};
      renderTable(Object.values(data));
    });
  });
});
