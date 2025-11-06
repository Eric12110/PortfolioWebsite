
        document.addEventListener("DOMContentLoaded", () => {
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
                    // name: document.getElementById('customerName').value.trim(),
                    // email: document.getElementById('customerEmail').value.trim(),
                    amount: document.getElementById('amount').value.trim(),
                    description: document.getElementById('description').value.trim(),
                    items: document.getElementById('items').value.split(/[#,]/).map(item => item.trim()).filter(Boolean)
                };

                try {
                    const response = await fetch(`${API_BASE_URL}/api/payment/create`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error || '建立付款請求失敗');
                    }
                    const formElement = document.createElement('form');
                    formElement.method = "POST";
                    formElement.action = data.action; // ✅ 注意大小寫

                    Object.entries(data.params).forEach(([key, value]) => { // ✅ Params 而不是 formData
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = key;
                        input.value = value;
                        formElement.appendChild(input);
                    });

                    document.body.appendChild(formElement);
                    formElement.submit();
                } catch (error) {
                    console.error(error);
                    feedback.className = 'mt-3 text-danger';
                    feedback.innerText = error.message || '建立付款請求失敗，請稍後再試。';
                    submitBtn.disabled = false;
                    submitBtn.innerText = '前往付款';
                }
            });
        });