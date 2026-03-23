import { Router } from 'express';
import { storage_service } from '../services/storage/repository';
import { process_metrics_collector } from '../utils/process_metrics';
import { waiting_queue } from '../services/socket/find_partner';
import type { Server } from 'socket.io';

const router = Router();

// Health check
router.get('/status', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Process-scoped metrics for this Node.js server only.
router.get('/metrics', (req, res) => {
  const io = req.app.get('io') as Server | undefined;

  res.status(200).json({
    process: process_metrics_collector.get_snapshot(),
    sockets: {
      online_users: io?.engine.clientsCount ?? 0,
      waiting_users: waiting_queue.length
    },
    storage: storage_service.get_stats()
  });
});

export default router; 