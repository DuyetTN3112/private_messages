import { io } from 'socket.io-client';
import { SOCKET_SERVER_URL } from './constants/socket';

export const socket = io(SOCKET_SERVER_URL);
