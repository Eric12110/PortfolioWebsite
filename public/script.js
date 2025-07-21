document.getElementById('loginBtn').addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  // 這邊只做簡單模擬，正式應該呼叫API驗證
  if (!username || !password) {
    alert('請輸入帳號密碼');
    return;
  }

  if (username === 'admin' && password === 'admin') {
    // admin 登入成功，顯示上傳區塊
    alert('登入成功');
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('message').innerText = `歡迎，管理員 ${username}`;
  } else {
    // 其他使用者，顯示登入成功訊息但不顯示上傳
    alert('登入失敗');
    document.getElementById('message').innerText = `歡迎，${username}`;
    document.getElementById('loginSection').style.display = 'none';
  }
});
const loginBtn = document.getElementById('loginLink');

if (loginBtn) {
  loginBtn.addEventListener('click', function (event) {
    console.log("Login link clicked");
    event.preventDefault(); // 避免跳頁

    const loginDiv = document.getElementById('loginSection');
    if (loginDiv) {
      loginDiv.style.display = (loginDiv.style.display === 'none' || loginDiv.style.display === '') ? 'block' : 'none';
    }
  });
}
document.querySelectorAll(".category-link").forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const category = this.getAttribute("data-category");
    loadAlbumsByCategory(category);
  });
});
function loadAlbumsByCategory(category) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = ""; // 清空原本內容

  database.ref(category).once("value").then(snapshot => {
    if (!snapshot.exists()) {
      gallery.innerHTML = "<p class='text-muted'>找不到任何資料。</p>";
      return;
    }

    snapshot.forEach(personSnap => {
      const personName = personSnap.key;

      const albumDiv = document.createElement("div");
      albumDiv.className = "mb-5";

      const title = document.createElement("h4");
      title.textContent = `📸 ${category} - ${personName}`;
      title.classList.add("mb-3", "border-bottom", "pb-2");
      albumDiv.appendChild(title);

      const row = document.createElement("div");
      row.className = "row g-3";

      personSnap.forEach(photoSnap => {
        const data = photoSnap.val();
        const col = document.createElement("div");
        col.className = "col-md-4 col-sm-6";

        col.innerHTML = `
          <div class="card h-100 shadow-sm">
            <img src="${data.url}" alt="${personName}" class="card-img-top" style="object-fit: cover; height: 300px;">
            <div class="card-body p-2 text-center">
              <small class="text-muted">${data.name}</small>
            </div>
          </div>
        `;
        row.appendChild(col);
      });

      albumDiv.appendChild(row);
      gallery.appendChild(albumDiv);
    });
  });
}
// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBg8EzN4UcX0g1JQ-6rhzSHLu_RD5NIPJA",
  authDomain: "loginregistration-1dba1.firebaseapp.com",
  databaseURL: "https://loginregistration-1dba1-default-rtdb.firebaseio.com",
  projectId: "loginregistration-1dba1",
  storageBucket: "loginregistration-1dba1.firebasestorage.app",
  messagingSenderId: "445119046757",
  appId: "1:445119046757:web:3ee19609f46b8a9b91928c",
  measurementId: "G-FWEP0T45HC"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const database = firebase.database();
window.uploadImage = function () {
  const category = document.getElementById("category").value;
  const file = document.getElementById("fileInput").files[0];
  const description = document.getElementById("albumDescription").value || "";
  const userName = prompt("請輸入此相簿的名稱（例如新人姓名）");

  if (!file || !userName) {
    alert("請選擇圖片並輸入相簿名稱");
    return;
  }

  const fileName = `${Date.now()}-${file.name}`;
  const albumPath = `${category}/${userName}`;
  const storageRef = storage.ref(`${albumPath}/${fileName}`);

  storageRef.put(file).then(snapshot => {
    return snapshot.ref.getDownloadURL();
  }).then(downloadURL => {
    // 建立相簿的節點（含描述）
    const albumRef = database.ref(albumPath);
    albumRef.push({
      url: downloadURL,
      name: fileName
    });

    // 儲存描述（若未儲存過才寫入）
    database.ref(`${albumPath}/_meta`).set({
      description: description
    });

    alert("上傳成功");
    loadAlbums();
  }).catch(err => {
    console.error(err);
    alert("上傳失敗");
  });
}


document.getElementById("uploadBtn").addEventListener("click", () => {
  const files = document.getElementById("fileInput").files;
  const category = document.getElementById("category").value;
  const file = document.getElementById("fileInput").files[0];
  const description = document.getElementById("albumDescription").value || "";
  const person = prompt("請輸入此相簿的名稱（例如新人姓名）");

  if (!files || files.length === 0) {
    alert("請選擇至少一張照片");
    return;
  }

  const statusDiv = document.getElementById("uploadStatus");
  statusDiv.innerText = "開始上傳...";

  let uploadedCount = 0;
  let failedCount = 0;

  Array.from(files).forEach(file => {
    const timestamp = Date.now();
    const storageRef = storage.ref(`${category}/${person}/${timestamp}_${file.name}`);
    const dbRef = database.ref(`${category}/${person}`).push();

    storageRef.put(file)
      .then(snapshot => snapshot.ref.getDownloadURL())
      .then(downloadURL => {
        return dbRef.set({
          url: downloadURL,
          name: file.name,
          uploadedAt: new Date().toISOString()
        });
      })
      .then(() => {
        uploadedCount++;
        statusDiv.innerText = `成功上傳 ${uploadedCount} 張${failedCount > 0 ? `，失敗 ${failedCount} 張` : ""}`;
      })
      .catch(error => {
        console.error("上傳失敗", error);
        failedCount++;
        statusDiv.innerText = `成功上傳 ${uploadedCount} 張，失敗 ${failedCount} 張`;
      });
  });
});

function loadAlbums() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  const categories = ["Wedding", "Portrait", "Maternity", "Film"];

  categories.forEach(category => {
    database.ref(category).once("value").then(snapshot => {
      snapshot.forEach(albumSnap => {
        const albumName = albumSnap.key;
        if (albumName === "_meta") return;

        const albumData = albumSnap.val();
        const photoKeys = Object.keys(albumData).filter(k => k !== "_meta");

        if (photoKeys.length === 0) return;

        const firstPhoto = albumData[photoKeys[0]].url;
        const description = albumData["_meta"]?.description || "";

        const col = document.createElement("div");
        col.className = "col-md-4 mb-4";
        col.innerHTML = `
          <div class="card h-100">
            <img src="${firstPhoto}" class="card-img-top" alt="${albumName}">
            <div class="card-body">
              <h5 class="card-title">${albumName}</h5>
              <p class="card-text">${description}</p>
              <a href="album.html?category=${category}&album=${encodeURIComponent(albumName)}" class="btn btn-outline-primary">觀看相簿</a>
            </div>
          </div>
        `;
        gallery.appendChild(col);
      });
    });
  });
}


window.onload = loadAlbums;
