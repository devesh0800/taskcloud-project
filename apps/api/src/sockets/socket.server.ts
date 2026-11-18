import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { prisma } from '../config/prisma';
import { MembershipStatus, Role } from '@prisma/client';

export interface SocketUser {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user: SocketUser;
  };
}

export let io: SocketIOServer | null = null;

/**
 * Extracts authentication token from socket handshake auth, headers, or cookies
 */
function extractToken(socket: Socket): string | null {
  // 1. Handshake auth object
  if (socket.handshake.auth && socket.handshake.auth.token) {
    return socket.handshake.auth.token;
  }

  // 2. Authorization header (Bearer <token>)
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 3. Cookie header (auth.token=<token>)
  const cookieHeader = socket.handshake.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const c of cookies) {
      if (c.startsWith('auth.token=')) {
        return decodeURIComponent(c.substring('auth.token='.length));
      }
    }
  }

  return null;
}

export function initSocketIO(httpServer: HttpServer, frontendUrl: string): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, success?: boolean) => void) => {
        if (!origin) return callback(null, true);
        if (
          origin === frontendUrl ||
          origin === 'http://localhost:3000' ||
          origin === 'http://127.0.0.1:3000' ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // 1. Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = extractToken(socket);

      if (!token) {
        return next(new Error('Unauthorized: Authentication required for real-time socket connection'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
      if (!decoded || !decoded.userId) {
        return next(new Error('Unauthorized: Invalid or expired authentication token'));
      }

      // Attach authenticated user details to socket data
      socket.data.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role as Role,
      };

      next();
    } catch (err: any) {
      return next(new Error('Unauthorized: Token verification failed'));
    }
  });

  // 2. Connection and Room Management
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.data.user;

    // Automatically join the user's private room
    const userRoom = `user_${user.userId}`;
    authSocket.join(userRoom);

    if (user.role === Role.TEACHER || user.role === Role.ADMIN) {
      authSocket.join(`teacher_${user.userId}`);
    }

    console.log(`[Socket.IO] Authenticated client connected: ${user.email} (${user.role}) in ${userRoom}`);

    /**
     * Authorized Class Room Join
     * Server verifies active enrollment or teacher ownership before granting room entry
     */
    authSocket.on('join_class_room', async (data: { classId: string }, callback?: (res: any) => void) => {
      try {
        const { classId } = data || {};
        if (!classId) {
          if (callback) callback({ success: false, error: 'classId is required' });
          return;
        }

        // Verify authorization
        let authorized = false;

        if (user.role === Role.ADMIN) {
          authorized = true;
        } else if (user.role === Role.TEACHER) {
          const cls = await prisma.class.findFirst({
            where: { id: classId, teacherId: user.userId },
            select: { id: true },
          });
          authorized = !!cls;
        } else if (user.role === Role.STUDENT) {
          const member = await prisma.classMember.findFirst({
            where: { classId, studentId: user.userId, status: MembershipStatus.ACTIVE },
            select: { id: true },
          });
          authorized = !!member;
        }

        if (!authorized) {
          authSocket.emit('error', {
            code: 'FORBIDDEN',
            message: 'You are not authorized to join this class room',
          });
          if (callback) callback({ success: false, error: 'Forbidden: Unauthorized class room subscription' });
          return;
        }

        const classRoom = `class_${classId}`;
        authSocket.join(classRoom);
        console.log(`[Socket.IO] User ${user.email} joined authorized room: ${classRoom}`);

        if (callback) callback({ success: true, room: classRoom });
      } catch (err: any) {
        if (callback) callback({ success: false, error: 'Failed to verify class room authorization' });
      }
    });

    /**
     * Leave Class Room
     */
    authSocket.on('leave_class_room', (data: { classId: string }, callback?: (res: any) => void) => {
      if (data && data.classId) {
        const classRoom = `class_${data.classId}`;
        authSocket.leave(classRoom);
        if (callback) callback({ success: true, room: classRoom });
      }
    });

    authSocket.on('disconnect', () => {
      console.log(`[Socket.IO] Authenticated client disconnected: ${user.email}`);
    });
  });

  return io;
}

/**
 * Emit event to a room
 */
export function emitToRoom(room: string, event: string, data: any): void {
  if (io) {
    io.to(room).emit(event, data);
  }
}

/**
 * Emit event to a class room
 */
export function emitToClass(classId: string, event: string, data: any): void {
  emitToRoom(`class_${classId}`, event, data);
}

/**
 * Emit event to a specific user
 */
export function emitToUser(userId: string, event: string, data: any): void {
  emitToRoom(`user_${userId}`, event, data);
}

/**
 * Broadcast persistent notification to user room with updated unread count
 */
export async function broadcastNotification(notification: {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  entityId?: string | null;
  createdAt: Date;
}): Promise<void> {
  if (!io) return;

  try {
    const unreadCount = await prisma.notification.count({
      where: { userId: notification.userId, isRead: false },
    });

    emitToUser(notification.userId, 'notification:new', {
      notification,
      unreadCount,
    });
  } catch (err) {
    // Non-blocking
  }
}
