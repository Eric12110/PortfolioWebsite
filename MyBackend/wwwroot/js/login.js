document.addEventListener("DOMContentLoaded", () => {
  //const loginForm = document.getElementById("loginForm");
  const signupBtn = document.getElementById("signupBtn");

  // 登入
//   loginForm.addEventListener("submit", async (e) => {
//     e.preventDefault();
//     const email = document.getElementById("email").value.trim();
//     const password = document.getElementById("password").value.trim();

//     try {
//       const userCred = await firebase.auth().signInWithEmailAndPassword(email, password);
//       Swal.fire({
//         icon: "success",
//         title: "登入成功",
//         text: `歡迎回來，${userCred.user.email}`,
//         timer: 1500,
//         showConfirmButton: false
//       }).then(() => {
//         // 登入後導向首頁或購物車
//         window.location.href = "/index.html";
//       });
//     } catch (err) {
//       console.error(err);
//       Swal.fire("登入失敗", err.message, "error");
//     }
//   });

document.getElementById("googleBtn").addEventListener("click", (event) => {
  event.preventDefault(); // ✅ 阻止 form 自動送出
  googleLogin();
});

function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  firebase.auth().signInWithPopup(provider)
    .then(async (result) => {
      const user = result.user;
      console.log("✅ 登入成功:", user.displayName, user.email);

      // ✅ 儲存 cookie（可簡單存 UID / email）
      document.cookie = `user_uid=${user.uid}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      document.cookie = `user_name=${encodeURIComponent(user.displayName)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      document.cookie = `user_email=${encodeURIComponent(user.email)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      // ✅ 也可以同步寫入 Firebase 資料庫（非必要）
      // await firebase.database().ref("users/" + user.uid).update({
      //   displayName: user.displayName,
      //   email: user.email,
      //   photoURL: user.photoURL || "",
      //   lastLogin: new Date().toISOString()
      // });

      // ✅ 跳轉首頁
      window.location.href = "/index.html";
    })
    .catch(error => {
      console.error("❌ 登入失敗:", error);
      alert("登入失敗：" + error.message);
    });
}



  // 註冊
  signupBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      Swal.fire("提醒", "請輸入信箱與密碼再註冊", "info");
      return;
    }

    try {
      const userCred = await firebase.auth().createUserWithEmailAndPassword(email, password);
      Swal.fire({
        icon: "success",
        title: "註冊成功",
        text: `歡迎 ${userCred.user.email}`,
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        window.location.href = "/index.html";
      });
    } catch (err) {
      console.error(err);
      Swal.fire("註冊失敗", err.message, "error");
    }
  });
});
