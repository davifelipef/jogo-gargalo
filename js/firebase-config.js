import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBsJnlFVx5BNsdspq9QACI5YRhbJS04kzM",
    authDomain: "jogo-gargalo.firebaseapp.com",
    projectId: "jogo-gargalo",
    storageBucket: "jogo-gargalo.firebasestorage.app",
    messagingSenderId: "423906358478",
    appId: "1:423906358478:web:24af6695871d903e63cc9f"
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);