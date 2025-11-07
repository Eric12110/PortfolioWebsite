document.addEventListener("DOMContentLoaded", () => {
  // 動態載入 header
  fetch('/header.html')
      .then(response => response.text())
      .then(html => {
          document.getElementById('headerContainer').innerHTML = html;
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
          document.body.appendChild(script);
      })
      .catch(err => console.error('載入 header 失敗', err));
 //firebase.auth().onAuthStateChanged(user => {
      // if (!user) {
      //   Swal.fire("請先登入", "登入後可查看訂單紀錄", "warning");
      //   setTimeout(() => location.href = 'login.html', 1500);
      //   return;
      // }

      //const uid = user.uid;
      //const ordersRef = firebase.database().ref(`orders/${uid}`);
      const container = document.getElementById("ordersContainer");

      ordersRef.on("value", snapshot => {
        container.innerHTML = "";

        if (!snapshot.exists()) {
          container.innerHTML = `<p class="text-center text-muted">目前沒有任何訂單 🛒</p>`;
          return;
        }

        const orders = Object.values(snapshot.val()).sort((a, b) => (b.PaymentDate || '').localeCompare(a.PaymentDate || ''));
        orders.forEach(o => {
          const statusClass = o.RtnCode === "1" ? "bg-success text-white" : "bg-warning";
          const statusText = o.RtnCode === "1" ? "付款成功 ✅" : "待付款 ⏳";
          const items = o.Items ? o.Items.split("#").join(", ") : "-";

          container.innerHTML += `
            <div class="card order-card">
              <div class="order-header d-flex justify-content-between align-items-center">
                <strong>訂單編號：${o.MerchantTradeNo}</strong>
                <span class="badge ${statusClass}">${statusText}</span>
              </div>
              <div class="order-body">
                <p><strong>金額：</strong> NT$ ${o.TradeAmt}</p>
                <p><strong>付款方式：</strong> ${o.PaymentType}</p>
                <p><strong>付款時間：</strong> ${o.PaymentDate}</p>
                <p><strong>商品內容：</strong> ${items}</p>
              </div>
            </div>
          `;
        });
      });

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
        o.MerchantTradeNo?.includes(keyword)
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
          <td>
            <button class="btn btn-outline-info btn-sm view-logistics" data-tradeno="${o.MerchantTradeNo}">
              查看物流
            </button>
          </td>
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

document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('view-logistics')) {
    const tradeNo = e.target.dataset.tradeno;
    try {
      const res = await fetch(`${API_BASE_URL}/api/logistics/query/${tradeNo}`);
      const data = await res.text();
      Swal.fire({
        title: '物流狀態',
        html: `<pre style="text-align:left">${data}</pre>`,
        icon: 'info',
        width: '600px'
      });
    } catch (err) {
      Swal.fire('錯誤', '查詢物流狀態失敗', 'error');
      console.error(err);
    }
  }
});
