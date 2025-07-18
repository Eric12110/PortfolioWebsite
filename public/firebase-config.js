// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXXXX",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const db = firebase.firestore();