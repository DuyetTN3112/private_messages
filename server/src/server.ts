import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { setup_socket_server } from './controllers/socket/setup_socket_server';
import routes from './routes/routes';
import { error_handler } from './middleware/error_handler';
import { logger } from './utils/logger';
import { setup_conversation_monitor } from './utils/conversation_monitor';
import { storage_service } from './services/storage/repository';
import { DEFAULT_PORT } from './constants/config';
import { process_metrics_collector } from './utils/process_metrics';

// Socket store type definition
export type SocketStoreType = Record<string, 'waiting' | 'matched' | null>;

// Interface cho Request extended
export interface AppRequest extends http.IncomingMessage {
  app: express.Application;
}

export interface ServerRuntime {
  app: express.Application;
  server: http.Server;
  io: Server;
  socket_store: SocketStoreType;
  close: () => Promise<void>;
}

export const create_server_runtime = (): ServerRuntime => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', routes);
  app.use(error_handler);

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    perMessageDeflate: false,
    httpCompression: false
  });

  const socket_store: SocketStoreType = {};
  app.set('socketStore', socket_store);
  app.set('io', io);

  io.use((socket: Socket, next) => {
    (socket.request as AppRequest).app = app;
    next();
  });

  const socket_setup = setup_socket_server(io);
  const monitor = setup_conversation_monitor(io);
  process_metrics_collector.start();
  let is_closed = false;

  const close = async (): Promise<void> => {
    if (is_closed) {
      return;
    }

    is_closed = true;
    monitor.stop();
    socket_setup.cleanup();
    process_metrics_collector.stop();
    await io.close();

    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    storage_service.clear();
  };

  return {
    app,
    server,
    io,
    socket_store,
    close
  };
};

export const start_server = async (port: number = Number(process.env['PORT'] ?? DEFAULT_PORT)): Promise<ServerRuntime> => {
  const runtime = create_server_runtime();

  await new Promise<void>((resolve, reject) => {
    runtime.server.listen(port, () => {
      logger.info(`Server đang chạy trên cổng ${String(port)}`);
      logger.info('✅ In-memory storage - ZERO external dependencies');
      logger.info(`📊 Storage stats: ${JSON.stringify(storage_service.get_stats())}`);
      resolve();
    });

    runtime.server.once('error', (error) => {
      reject(error);
    });
  });

  return runtime;
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, cleaning up...');
  storage_service.clear();
  process.exit(0);
});

if (require.main === module) {
  void start_server();
}