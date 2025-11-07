// ✅ 初始化 Firebase（請填入你的 config）
        const firebaseConfig = {
            apiKey: "AIzaSyBg8EzN4UcX0g1JQ-6rhzSHLu_RD5NIPJA",
            authDomain: "loginregistration-1dba1.firebaseapp.com",
            databaseURL: "https://loginregistration-1dba1.asia-southeast1.firebasedatabase.app",
            projectId: "loginregistration-1dba1",
            storageBucket: "loginregistration-1dba1.firebasestorage.app",
            messagingSenderId: "445119046757",
            appId: "1:445119046757:web:3ee19609f46b8a9b91928c",
            measurementId: "G-FWEP0T45HC"
        };
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const database = firebase.database();
        const storage = firebase.storage();