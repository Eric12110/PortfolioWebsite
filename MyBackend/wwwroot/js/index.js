window.addEventListener("DOMContentLoaded", () => {
  let authArea = null;
  loadImages();
  fetch('header.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('headerContainer').innerHTML = html;
      const script = document.createElement("script");
      script.src = "/js/script.js";
      document.body.appendChild(script);
      authArea = document.getElementById("authArea");
      if (!authArea) {
      console.warn("⚠️ 找不到 #authArea，請確認 header.html 是否有該元素");
      return;
      }

      // ✅ 登入狀態檢查（載入完 header 後才能操作）
      updateAuthArea();
      })
    .catch(err => {
      console.error('載入 header 失敗', err);
    });
});
  function updateAuthArea() {
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [key, value] = c.trim().split("=");
      acc[key] = decodeURIComponent(value || "");
      return acc;
    }, {});

    if (cookies.user_uid) {
      authArea.innerHTML = `
        <span class="me-3 text-success fw-bold">👋 歡迎 ${cookies.user_name || cookies.user_email}</span>
        <button class="btn btn-outline-danger btn-sm" onclick="logout()">登出</button>
      `;
    } else {
      authArea.innerHTML = `
        <a class="btn btn-outline-primary btn-sm" href="/login.html">登入</a>
      `;
    }
  }


  function logout() {
    // 清空 cookie
    document.cookie.split(";").forEach(c => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
    firebase.auth().signOut();
    window.location.href = "/login.html";
  }

let swiperInstance = null;
  function initSwiper() {
    if (swiperInstance) swiperInstance.destroy(true, true);
    const swiper = new Swiper('.swiper', {
      slidesPerView: 3,      // 一次顯示3張
      spaceBetween: 0,      // 圖片間距10px，可調整
      loop: true,            // 循環輪播
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      // 如果要自動播放，可加：
      autoplay: {
        delay: 6000,
        disableOnInteraction: false,
      },
    });
  }

    firebase.auth().onAuthStateChanged(user => {
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const authLinks = document.getElementById('authLinks');
    if (user) {
      console.log("登入中使用者：", user.email);
      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "block";
      if (authLinks) authLinks.style.display = "block";
      if (user && user.uid === OWNER_UID) {
        document.getElementById('uploadSection').style.display = 'block';
      } else {
        document.getElementById('uploadSection').style.display = 'none';
      }
    } else {
      console.log("目前未登入");
      if (loginBtn) loginBtn.style.display = "block";
      if (logoutBtn) logoutBtn.style.display = "none";
      if (authLinks) authLinks.style.display = "none";
    }
  });

  function logout() { 
    firebase.auth().signOut().then(() => {
      Swal.fire("已登出", "", "success");
    });
  }

  document.getElementById("uploadBtn").addEventListener("click", () => {
    const files = document.getElementById("fileInput").files;
    const category = document.getElementById("category").value;
    const file = document.getElementById("fileInput").files[0];
    const description = document.getElementById("albumDescription").value || "";
    const person = document.getElementById("personName").value.trim();
    const albumPath = `${category}/${person}`;
    if (!files || files.length === 0) {
      alert("請選擇至少一張照片");
      return;
    }

    const statusDiv = document.getElementById("uploadStatus");
    statusDiv.innerText = "開始上傳...";

    let uploadedCount = 0;
    let failedCount = 0;
    // 儲存描述（若未儲存過才寫入）
    database.ref(`${albumPath}/_meta`).set({
      description: description
    });
    Array.from(files).forEach(file => {
      const timestamp = Date.now();
      const storageRef = firebase.storage().ref(`${category}/${person}/${timestamp}_${file.name}`);
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
          alert(`上傳 ${file.name} 失敗: ${error.message}`);
        });
    });
  });

  function logout() {
    // 取出所有 cookie 名稱
    document.cookie.split(";").forEach(c => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();

      // 嘗試以不同 path 清除（最常見是 /）
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${location.hostname};`;
    });
    
    console.log("✅ 所有 cookie 已清除");
    alert("已登出");
    location.reload();
  }

  function showLoginSection() {
    const loginSection = document.getElementById("loginSection");
    console.log("顯示登入區塊");
    loginSection.style.display = "block";
  }

  document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged(user => {
      console.log("目前使用者2：", user.uid);
      if (user && user.uid === OWNER_UID) {
        document.getElementById('uploadSection').style.display = 'block';
      } else {
        document.getElementById('uploadSection').style.display = 'none';
      }
    });
  });

  // Google 登入
  function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then(result => {
        const user = result.user;
        console.log("登入成功:", user.displayName, user.email);
        console.log("UID:", user.uid); // 之後設定資料庫權限用
      })
      .catch(error => {
        console.error("登入失敗:", error);
      });
  }

  // 登出
  function googleLogout() {
    firebase.auth().signOut().then(() => {
      console.log("已登出");
    });
  }

  // 從 Firebase 載入圖片資料，渲染管理列表和輪播
  function loadImages() {
    database.ref("index").once("value", snapshot => {
      const data = snapshot.val() || {};
      imageList.innerHTML = "";
      swiperWrapper.innerHTML = "";

      Object.entries(data).forEach(([key, { url, description }]) => {
        // 編輯區列表
        if (auth.currentUser && auth.currentUser.uid === OWNER_UID) {
          const div = document.createElement("div");
          div.classList.add("image-item");
          div.innerHTML = `
          <img src="${url}" alt="圖片" />
          <button onclick="deleteImage('${key}', '${url}')">刪除</button>
        `;
          imageList.appendChild(div);
        }

        // 輪播圖片
        const slide = document.createElement("div");
        slide.classList.add("swiper-slide");
        slide.innerHTML = `<img src="${url}" alt="圖片" />`;
        swiperWrapper.appendChild(slide);
      });

      initSwiper();
    });
  }
  // 刪除圖片（資料庫 + Storage）
  function deleteImage(key, url) {
    if (!confirm("確定刪除這張圖片嗎？")) return;

    // 1. 刪除 Storage 裡的圖片
    storage.refFromURL(url).delete()
      .then(() => {
        // 2. 刪除 Realtime Database 中的資料
        return database.ref("index/" + key).remove();
      })
      .then(() => {
        alert("圖片已刪除");
        loadImages();
      })
      .catch(err => {
        console.error(err);
        alert("刪除失敗");
      });
  }
  const fileInput = document.getElementById("fileInput2");
  // 上傳多張圖片
  function uploadImage() {
    const files = fileInput.files;
    if (!files.length) {
      alert("請先選擇圖片");
      return;
    }

    let uploadCount = 0;
    for (const file of files) {
      const storageRef = storage.ref(`index/${Date.now()}_${file.name}`);
      const uploadTask = storageRef.put(file);

      uploadTask.on(
        "state_changed",
        snapshot => {
          // 可做進度顯示
        },
        error => {
          console.error("上傳失敗", error);
          alert("圖片上傳失敗");
        },
        () => {
          uploadTask.snapshot.ref.getDownloadURL().then(url => {
            const newImageRef = database.ref("index").push();
            newImageRef.set({
              url: url,
              description: ""
            }).then(() => {
              uploadCount++;
              if (uploadCount === files.length) {
                alert("所有圖片上傳成功");
                fileInput.value = "";
                previewArea.innerHTML = "";
                loadImages();
              }
            });
          });
        }
      );
    }
  }