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

    const form = document.getElementById('paymentForm');
    const feedback = document.getElementById('feedback');
    const submitBtn = document.getElementById('submitBtn');
    // ✅ 從 localStorage 讀取購物車資料
    const storedItems = JSON.parse(localStorage.getItem("checkoutItems") || "[]");
    const total = localStorage.getItem("checkoutTotal") || 0;

    // 顯示在畫面上（你也可以自訂顯示區域）
    const descField = document.getElementById("description");
    const amountField = document.getElementById("amount");
    const itemsField = document.getElementById("items");

    if (storedItems.length > 0) {
    const itemNames = storedItems.map(i => `${i.name}x${i.quantity}`).join("#");
    descField.value = `購買商品共 ${storedItems.length} 項`;
    amountField.value = total;
    itemsField.value = itemNames;
    } else {
    console.warn("⚠️ 沒有偵測到購物車資料，請重新加入商品");
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = '處理中...';
        feedback.className = 'mt-3 text-muted';
        feedback.innerText = '正在建立付款資訊，請稍候...';

        const payload = {
            amount: document.getElementById('amount').value.trim(),
            description: document.getElementById('description').value.trim(),
            items: document.getElementById('items').value.split(/[#,]/).map(item => item.trim()).filter(Boolean)
        };

        try {
            // ✅ 必須是絕對路徑（Render / Local）
            const response = await fetch(`${API_BASE_URL}/api/payment/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // ✅ 這裡用 text() 防止 CSP 報錯（有些 proxy 會返回 HTML）
            const rawText = await response.text();
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (err) {
                throw new Error('伺服器回傳格式錯誤：' + rawText.substring(0, 100));
            }

            if (!response.ok) {
                throw new Error(data.error || '建立付款請求失敗');
            }

            // ✅ 安全建立表單（符合 CSP）
            const formElement = document.createElement('form');
            formElement.method = 'POST';
            formElement.action = data.action; // https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5
            formElement.style.display = 'none'; // 隱藏 form

            Object.entries(data.params || data.Params || {}).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                formElement.appendChild(input);
            });

            document.body.appendChild(formElement);

            // ✅ 這裡用 setTimeout 讓 DOM 確保掛載完再 submit（可避免 about:blank#blocked）
            setTimeout(() => {
                formElement.submit();
            }, 50);
            localStorage.removeItem("checkoutItems");
            localStorage.removeItem("checkoutTotal");
            firebase.database().ref("cart").remove(); // ✅ 清空雲端購物車
        } catch (error) {
            console.error("❌ 建立付款請求失敗:", error);
            feedback.className = 'mt-3 text-danger';
            feedback.innerText = error.message || '建立付款請求失敗，請稍後再試。';
            submitBtn.disabled = false;
            submitBtn.innerText = '前往付款';
        }
    });

});
