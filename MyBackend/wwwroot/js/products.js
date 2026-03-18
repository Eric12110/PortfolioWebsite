// js/shop.js
document.addEventListener("DOMContentLoaded", () => {
  const productList = document.getElementById("productList");

  // 監聽商品資料
  firebase.database().ref("products").on("value", (snapshot) => {
    productList.innerHTML = "";

    if (!snapshot.exists()) {
      productList.innerHTML = `<p class="text-center text-muted">目前沒有商品 🛒</p>`;
      return;
    }

    snapshot.forEach((item) => {
      const data = item.val();
      const card = document.createElement("div");
      card.className = "col-12 col-sm-6 col-md-4 col-lg-3";
      card.setAttribute("data-aos", "fade-up");

      card.innerHTML = `
        <div class="card product-card">
          <img src="${data.imageUrl || 'https://via.placeholder.com/400x250?text=No+Image'}" 
               alt="${data.name}" class="product-img">
          <div class="product-body">
            <h5 class="fw-bold">${data.name}</h5>
            <p class="text-muted small">${data.description || "沒有描述"}</p>
            <p class="price">NT$ ${data.price}</p>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-primary w-50" onclick="viewProduct('${item.key}')">
                查看詳情
              </button>
              <button class="btn btn-add w-50" 
                      onclick="addToCart('${item.key}', '${data.name}', '${data.price}', '${data.imageUrl || ''}')">
                加入購物車
              </button>
            </div>
          </div>
        </div>
      `;
      productList.appendChild(card);
    });
  });
});

// 查看詳情
function viewProduct(id) {
  window.location.href = `product-detail.html?id=${id}`;
}

// ✅ 加入購物車（登入後才可執行）
function addToCart(id, name, price, imageUrl) {
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      Swal.fire({
        icon: "warning",
        title: "請先登入",
        text: "登入後才能加入購物車",
        confirmButtonText: "前往登入",
      }).then(() => (window.location.href = "login.html"));
      return;
    }

    const cartRef = firebase.database().ref(`cart/${user.uid}`);

    // 檢查購物車中是否已有相同商品
    cartRef.once("value", (snapshot) => {
      let foundKey = null;

      snapshot.forEach((item) => {
        const data = item.val();
        if (data.productId === id) {
          foundKey = item.key;
        }
      });

      if (foundKey) {
        // 已存在 → 數量 +1
        const currentQty = snapshot.child(foundKey).val().quantity || 1;
        cartRef.child(foundKey).update({ quantity: currentQty + 1 });
      } else {
        // 新增新商品
        const newItem = {
          productId: id,
          name,
          price: parseFloat(price),
          imageUrl,
          quantity: 1,
          addedAt: new Date().toISOString(),
        };
        cartRef.push(newItem);
      }

      Swal.fire({
        icon: "success",
        title: "已加入購物車！",
        text: `${name} 已成功加入購物車`,
        showConfirmButton: false,
        timer: 1500,
      });
    });
  });
}
