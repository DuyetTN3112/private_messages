import { createApp } from 'vue';
import App from './App.vue';
import { io } from 'socket.io-client';
import './assets/animations.css';

// Tạo kết nối socket
const socket = io('http://localhost:3000');

// Tạo app Vue
const app = createApp(App);

// Thêm socket vào global để tất cả component có thể truy cập
app.config.globalProperties.$socket = socket;

app.mount('#app'); 