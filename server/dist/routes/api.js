"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// API route kiểm tra trạng thái server
router.get('/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date(),
        message: 'Server đang hoạt động bình thường'
    });
});
// API route lấy thông tin người dùng hiện tại
router.get('/stats', (req, res) => {
    const io = req.app.get('io');
    if (!io) {
        logger_1.logger.error('Socket.IO server chưa được khởi tạo');
        return res.status(500).json({ error: 'Lỗi nội bộ server' });
    }
    // Lấy số lượng người dùng từ io
    const online_users = Object.keys(io.sockets.sockets).length || 0;
    // Lấy số người dùng đang chờ từ socket store
    const socketStore = req.app.get('socketStore') || {};
    const waiting_users = Object.values(socketStore).filter((state) => state === 'waiting').length || 0;
    res.json({
        online_users,
        waiting_users,
        timestamp: new Date()
    });
});
exports.default = router;
