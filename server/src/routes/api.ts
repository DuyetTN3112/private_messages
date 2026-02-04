import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { logger } from '../utils/logger';

const router = Router();

// API route kiểm tra trạng thái server
router.get('/status', (_req: Request, res: Response): void => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    message: 'Server đang hoạt động bình thường'
  });
});

// API route lấy thông tin người dùng hiện tại
router.get('/stats', (req: Request, res: Response): void => {
  const io = req.app.get('io') as Server | undefined;
  
  if (!io) {
    logger.error('Socket.IO server chưa được khởi tạo');
    res.status(500).json({ error: 'Lỗi nội bộ server' });
    return;
  }

  // Lấy số lượng người dùng từ io
  // io.sockets.sockets is a Map in Socket.IO v4
  const online_users = io.sockets.sockets.size;
  
  // Lấy số người dùng đang chờ từ socket store
  const socket_store = req.app.get('socketStore') as { [key: string]: string } | undefined;
  const waiting_users = socket_store 
    ? Object.values(socket_store).filter((state: unknown) => state === 'waiting').length 
    : 0;
  
  res.json({
    online_users,
    waiting_users,
    timestamp: new Date()
  });
});

export default router; 