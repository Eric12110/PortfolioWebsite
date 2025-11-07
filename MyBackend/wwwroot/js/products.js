// js/shop.js

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

      const productList = document.getElementById("productList");

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
                  <button class="btn btn-add w-50" onclick="addToCart('${item.key}', '${data.name}', '${data.price}', '${data.imageUrl || ''}')">
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

    // ✅ 加入購物車（自動合併同商品）
function addToCart(id, name, price, imageUrl) {
  const cartRef = firebase.database().ref("cart");

  cartRef.once("value", (snapshot) => {
    let found = false;

    snapshot.forEach((item) => {
      const data = item.val();
      if (data.productId === id) {
        // 商品已存在，增加數量
        const newQty = (data.quantity || 1) + 1;
        firebase.database().ref(`cart/${item.key}`).update({
          quantity: newQty,
        });
        found = true;
      }
    });

    if (!found) {
      // 新增商品
      const newItem = {
        productId: id,
        name,
        price,
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
}

