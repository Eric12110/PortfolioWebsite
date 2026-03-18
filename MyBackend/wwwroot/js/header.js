window.addEventListener("DOMContentLoaded", () => {
  let authArea = null;
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
      initChatBot();
    })
    .catch(err => {
      console.error('載入 header 失敗', err);
    });
});
window.logout = function () {
  // 清空 cookie
  document.cookie.split(";").forEach(c => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
  });
  firebase.auth().signOut();
  window.location.href = "/login.html";
}

const cookies = document.cookie.split(";").reduce((acc, c) => {
  const [key, value] = c.trim().split("=");
  acc[key] = decodeURIComponent(value || "");
  return acc;
}, {});

function updateAuthArea() {
  if (cookies.user_uid && authLinks) {
    authArea.innerHTML = `
        <span class="me-3 text-success fw-bold">👋 歡迎 ${cookies.user_name || cookies.user_email}</span>
        <button class="btn btn-outline-danger btn-sm" onclick="logout()">登出</button>
      `;
    authLinks.style.display = "block";
  } else {
    authLinks.style.display = "none";
    authArea.innerHTML = `
        <a class="btn btn-outline-primary btn-sm" href="/login.html">登入</a>
      `;
  }
}

function initChatBot() {
  const chatFab = document.getElementById('chatFab');
  const chatbot = document.getElementById('chatbot');
  const chatClose = document.getElementById('chatClose');

  if (chatFab && chatbot) {
    chatFab.onclick = () => {
      chatbot.style.display = 'block';
      append('bot', '您好，我是客服助理！');
    };
  } else {
    return;
  }

  if (chatClose) {
    chatClose.onclick = () => chatbot.style.display = 'none';
  }


  const faq = [
    { q: /付款|支付|金流/i, a: "我們支援 ECPay 信用卡與多元付款；完成支付後可於「訂單查詢」查看狀態。" },
    { q: /運費|物流|出貨/i, a: "目前支援超商取貨與宅配，付款成功後 1-2 個工作天出貨。" },
    { q: /發票|統編/i, a: "可開立雲端發票，請於結帳留言統編抬頭。" },
  ];

  function append(role, text) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerHTML = text;
    document.getElementById('chatBody').appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  async function handleQuery(text) {
    // 1️⃣ 檢查是否為訂單查詢
    const m = text.match(/[A-Z]{2}\d{12,}/i);
    if (m) {
      append('bot', '稍等，我幫你查詢訂單狀態…');
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/lookup/${encodeURIComponent(m[0])}`);
        const data = await res.json();
        if (data && data.MerchantTradeNo) {
          append('bot', `
          訂單編號：${data.MerchantTradeNo}<br>
          金額：NT$ ${data.TradeAmt}<br>
          狀態：${data.RtnCode == '1' ? '✅ 已付款' : '⏳ 待付款'}
        `);
        } else {
          append('bot', '查不到這個訂單，請確認訂單編號是否正確。');
        }
      } catch {
        append('bot', '查詢時發生錯誤，稍後再試。');
      }
      return;
    }

    // 2️⃣ FAQ 快速回答
    for (const f of faq) {
      if (f.q.test(text)) {
        append('bot', f.a);
        return;
      }
    }

    // 3️⃣ 呼叫 AI 回答
    append('bot', '🤔 思考中，請稍候...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      append('bot', data.reply || "抱歉，目前無法回覆這個問題。");
    } catch (err) {
      console.error(err);
      append('bot', "伺服器暫時忙碌，請稍後再試。");
    }
  }


  // 開關 UI
  document.getElementById('chatFab').onclick = () => {
    console.log('open chatbot');
    document.getElementById('chatbot').style.display = 'block';
    append('bot', '您好，我是客服助理！可以協助您付款、物流、訂單查詢等問題。');
  };
  document.getElementById('chatClose').onclick = () => {
    document.getElementById('chatbot').style.display = 'none';
  };

  // 送出
  document.getElementById('chatSend').onclick = () => {
    const input = document.getElementById('chatText');
    const t = input.value.trim();
    if (!t) return;
    append('user', t);
    input.value = '';
    handleQuery(t);
  };

  // Enter 送出
  document.getElementById('chatText').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { document.getElementById('chatSend').click(); }
  });
}