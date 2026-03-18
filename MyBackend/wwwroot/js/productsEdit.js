// js/products.js
const form = document.getElementById("productForm");
const table = document.getElementById("productTable");

// 監聽 Firebase 資料變化
firebase.database().ref("products").on("value", (snapshot) => {
  table.innerHTML = "";
  snapshot.forEach(item => {
    const data = item.val();
    table.innerHTML += `
      <tr>
        <td><img src="${data.imageUrl || ''}" width="80"></td>
        <td>${data.name}</td>
        <td>${data.description}</td>
        <td>NT$${data.price}</td>
        <td>${data.stock}</td>
        <td>
          <button class="btn btn-sm btn-warning me-2" onclick="editProduct('${item.key}', '${data.name}', '${data.description}', '${data.price}', '${data.stock}')">編輯</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct('${item.key}')">刪除</button>
        </td>
      </tr>
    `;
  });
});

// 新增或更新商品
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("productId").value || firebase.database().ref("products").push().key;
  const name = document.getElementById("productName").value;
  const desc = document.getElementById("productDesc").value;
  const price = document.getElementById("productPrice").value;
  const stock = document.getElementById("productStock").value;
  const file = document.getElementById("productImage").files[0];

  let imageUrl = "";

  if (file) {
    const storageRef = firebase.storage().ref(`products/${id}/${file.name}`);
    await storageRef.put(file);
    imageUrl = await storageRef.getDownloadURL();
  }

  await firebase.database().ref("products/" + id).set({
    name,
    description: desc,
    price,
    stock,
    imageUrl
  });

  Swal.fire("✅ 儲存成功", "商品資料已更新", "success");
  form.reset();
  document.getElementById("productId").value = "";
});

// 編輯商品
window.editProduct = (id, name, desc, price, stock) => {
  document.getElementById("productId").value = id;
  document.getElementById("productName").value = name;
  document.getElementById("productDesc").value = desc;
  document.getElementById("productPrice").value = price;
  document.getElementById("productStock").value = stock;
  Swal.fire("✏️ 編輯模式", "請修改資料後按儲存", "info");
};

// 刪除商品
window.deleteProduct = async (id) => {
  const result = await Swal.fire({
    title: "確定刪除？",
    text: "刪除後無法恢復！",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消"
  });
  if (!result.isConfirmed) return;
  await firebase.database().ref("products/" + id).remove();
  Swal.fire("🗑️ 已刪除", "商品資料已移除", "success");
};
