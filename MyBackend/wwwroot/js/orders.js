document.addEventListener("DOMContentLoaded", () => {
  const ADMIN_UID = "7YL4JKlCh4M5ekDe9SzwAjXqLb03";
  const tbody = document.getElementById("ordersBody");
  const searchInput = document.getElementById("search");

  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      Swal.fire("請先登入", "登入後才能查看訂單", "warning")
        .then(() => window.location.href = "login.html");
      return;
    }

    const dbRef = (user.uid === ADMIN_UID)
      ? firebase.database().ref("orders")
      : firebase.database().ref(`orders/${user.uid}`);

    dbRef.on("value", snapshot => {
      let allOrders = [];

      if (user.uid === ADMIN_UID) {
        const all = snapshot.val() || {};
        for (const uid in all) {
          for (const key in all[uid]) {
            allOrders.push({ ...all[uid][key], key, uid });
          }
        }
      } else {
        const orders = snapshot.val() || {};
        for (const key in orders) {
          allOrders.push({ ...orders[key], key, uid: user.uid });
        }
      }

      renderTable(allOrders);
    });

    // ✅ 刪除訂單
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-order")) {
        const uid = e.target.dataset.uid;
        const key = e.target.dataset.key;

        Swal.fire({
          title: "確定刪除此訂單？",
          text: "此操作無法復原！",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "刪除",
          cancelButtonText: "取消",
          confirmButtonColor: "#d33"
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await firebase.database().ref(`orders/${uid}/${key}`).remove();
              Swal.fire("刪除成功", "訂單已被移除", "success");
            } catch (err) {
              console.error(err);
              Swal.fire("錯誤", "刪除訂單失敗", "error");
            }
          }
        });
      }
  });
    // 搜尋
    searchInput.addEventListener("input", () => {
      dbRef.once("value", snapshot => {
        let allOrders = [];

        if (user.uid === ADMIN_UID) {
          const all = snapshot.val() || {};
          for (const uid in all) {
            for (const key in all[uid]) {
              allOrders.push({ ...all[uid][key], key, uid });
            }
          }
        } else {
          const orders = snapshot.val() || {};
          for (const key in orders) {
            allOrders.push({ ...orders[key], key, uid: user.uid });
          }
        }

        renderTable(allOrders);
      });
    });
  });

  // ✅ 渲染表格
  function renderTable(orders) {
    const keyword = searchInput.value.trim();
    const filtered = orders.filter(o =>
      !keyword || o.MerchantTradeNo?.includes(keyword)
    );

    tbody.innerHTML = filtered.length
      ? filtered.map(o => `
        <tr>
          <td>${o.MerchantTradeNo}</td>
          <td>${o.TradeAmt}</td>
          <td>${o.PaymentDate}</td>
          <td>${o.PaymentType}</td>
          <td>${o.RtnCode == "1" 
                ? '<span class="badge bg-success">成功</span>' 
                : '<span class="badge bg-warning text-dark">待付款</span>'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary view-detail" 
              data-uid="${o.uid}" data-key="${o.key}">
              查看明細
            </button>
            <button class="btn btn-sm btn-outline-primary delete-order" 
              data-uid="${o.uid}" data-key="${o.key}">
              刪除
            </button>
          </td>
        </tr>`
      ).join("")
      : `<tr><td colspan="6" class="text-center text-muted">目前沒有訂單</td></tr>`;
  }

  // ✅ 點擊查看明細
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("view-detail")) {
      const uid = e.target.dataset.uid;
      const key = e.target.dataset.key;

      try {
        const snapshot = await firebase.database().ref(`orders/${uid}/${key}`).once("value");
        const order = snapshot.val();

        if (!order) {
          Swal.fire("錯誤", "找不到此訂單", "error");
          return;
        }

        const items = order.Items 
          ? order.Items.split("#").join("<br>")
          : "無商品資料";

        Swal.fire({
          title: `訂單明細`,
          html: `
            <div class="text-start">
              <p><strong>訂單編號：</strong> ${order.MerchantTradeNo}</p>
              <p><strong>金額：</strong> NT$ ${order.TradeAmt}</p>
              <p><strong>付款方式：</strong> ${order.PaymentType}</p>
              <p><strong>付款時間：</strong> ${order.PaymentDate || "尚未付款"}</p>
              <p><strong>狀態：</strong> ${order.RtnCode == "1" ? "✅ 成功" : "⏳ 待付款"}</p>
              <hr>
              <p><strong>商品項目：</strong><br>${items}</p>
            </div>
          `,
          icon: "info",
          width: 600
        });
      } catch (err) {
        console.error(err);
        Swal.fire("錯誤", "無法載入訂單明細", "error");
      }
    }
  });
});
