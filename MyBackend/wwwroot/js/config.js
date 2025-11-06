// 決定要連線的 API 伺服器位置
const API_BASE_URL = window.location.hostname.includes("localhost") 
    ? "http://localhost:5101" // 本地測試
    : "https://portfoliowebsite-b45w.onrender.com"; // Render 正式站
