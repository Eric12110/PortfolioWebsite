const cartList = document.getElementById("cartList");
const totalAmount = document.getElementById("totalAmount");

document.addEventListener("DOMContentLoaded", () => {
    // 動態載入 header
    fetch('header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('headerContainer').innerHTML = html;
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
            document.body.appendChild(script);
        })
        .catch(err => console.error('載入 header 失敗', err));

    const cartRef = firebase.database().ref("cart");
    cartRef.on("value", (snapshot) => {
    cartList.innerHTML = "";
    let total = 0;

    if (!snapshot.exists()) {
        cartList.innerHTML = `<p class="text-center text-muted">購物車目前是空的 🛒</p>`;
        totalAmount.textContent = "NT$ 0";
        return;
    }

    snapshot.forEach((item) => {
        const data = item.val();
        total += parseFloat(data.price) * (data.quantity || 1);

        const row = document.createElement("div");
        row.className = "col-12";
        row.innerHTML = `
        <div class="card cart-card p-3">
            <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-3">
              <img src="${data.imageUrl || 'https://via.placeholder.com/100'}" class="cart-img" alt="${data.name}">
              <div>
                <h6 class="fw-bold mb-1">${data.name}</h6>
                <p class="text-muted small mb-1">NT$ ${data.price}</p>
                <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-outline-secondary" onclick="changeQty('${item.key}', ${data.quantity || 1}, -1)">－</button>
                  <span>${data.quantity || 1}</span>
                <button class="btn btn-sm btn-outline-secondary" onclick="changeQty('${item.key}', ${data.quantity || 1}, 1)">＋</button>
                </div>
              </div>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="removeItem('${item.key}', '${data.name}')">
                <i class="bi bi-trash"></i> 刪除
            </button>
            </div>
        </div>
        `;
        cartList.appendChild(row);
    });

    totalAmount.textContent = "NT$ " + total.toLocaleString();
    });
});

// 刪除商品
function removeItem(id, name) {
    Swal.fire({
    title: "確定要刪除嗎？",
    text: `將從購物車中移除「${name}」`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
    }).then((result) => {
    if (result.isConfirmed) {
        firebase.database().ref("cart").child(id).remove();
        Swal.fire("已刪除！", `${name} 已從購物車移除`, "success");
    }
    });
}

// ✅ 前往結帳：將購物車資料存入 localStorage
function goCheckout() {
  const cartRef = firebase.database().ref("cart");

  cartRef.once("value", (snapshot) => {
    if (!snapshot.exists()) {
      Swal.fire("購物車是空的", "請先加入商品再結帳", "warning");
      return;
    }

    const cartItems = [];
    let total = 0;

    snapshot.forEach((item) => {
      const data = item.val();
      cartItems.push({
        name: data.name,
        price: parseFloat(data.price),
        quantity: data.quantity || 1,
      });
      total += parseFloat(data.price) * (data.quantity || 1);
    });

    // ✅ 暫存到 localStorage（付款頁會用）
    localStorage.setItem("checkoutItems", JSON.stringify(cartItems));
    localStorage.setItem("checkoutTotal", total);

    Swal.fire({
      title: "前往結帳？",
      text: `總金額 NT$ ${total}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "前往付款",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = "payment.html";
      }
    });
  });
}

// ✅ 調整商品數量
function changeQty(id, currentQty, delta) {
  const newQty = currentQty + delta;
  if (newQty <= 0) {
    // 數量為0時自動刪除
    firebase.database().ref("cart").child(id).remove();
    return;
  }

  firebase.database().ref("cart").child(id).update({
    quantity: newQty,
  });
}
