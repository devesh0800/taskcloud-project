'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  entityId?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  joinClassRoom: (classId: string) => void;
  leaveClassRoom: (classId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);
  const activeRooms = useRef<Set<string>>(new Set());

  // Determine socket server URL
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
      : 'http://localhost:5000');

  // Fetch initial notifications & unread count
  const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingNotifications(true);
      const res = await apiClient.get('/notifications', {
        params: { page, limit },
      });
      if (res.data?.success && res.data?.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isAuthenticated]);

  // Fetch unread count independently
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get('/notifications/unread-count');
      if (res.data?.success && res.data?.data) {
        setUnreadCount(res.data.data.unreadCount ?? 0);
      }
    } catch {
      // Non-blocking
    }
  }, [isAuthenticated]);

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      fetchNotifications();
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await apiClient.patch('/notifications/mark-all-read');
      toast.success('All notifications marked as read');
    } catch {
      fetchNotifications();
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      await apiClient.delete(`/notifications/${id}`);
      toast.success('Notification removed');
    } catch {
      fetchNotifications();
    }
  };

  // Join a class room with server verification
  const joinClassRoom = useCallback(
    (classId: string) => {
      if (socket && isConnected && classId) {
        if (!activeRooms.current.has(classId)) {
          socket.emit('join_class_room', { classId }, (response: any) => {
            if (response?.success) {
              activeRooms.current.add(classId);
            }
          });
        }
      }
    },
    [socket, isConnected]
  );

  // Leave a class room
  const leaveClassRoom = useCallback(
    (classId: string) => {
      if (socket && isConnected && classId) {
        socket.emit('leave_class_room', { classId });
        activeRooms.current.delete(classId);
      }
    },
    [socket, isConnected]
  );

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Connect to Socket.IO server with credentials (sends HttpOnly cookies)
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      fetchNotifications();
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-Time Event Listeners
    newSocket.on('notification:new', (data: { notification: NotificationItem; unreadCount: number }) => {
      if (data?.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
        setUnreadCount(data.unreadCount ?? ((prev) => prev + 1));

        // Display Sonner toast notification
        toast(data.notification.title, {
          description: data.notification.message,
          action: data.notification.link
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = data.notification.link!;
                },
              }
            : undefined,
        });
      }
    });

    newSocket.on('notification:updated', (data: { id: string; isRead: boolean; unreadCount: number }) => {
      if (data) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === data.id ? { ...n, isRead: data.isRead } : n))
        );
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      }
    });

    newSocket.on('notification:all_read', (data: { unreadCount: number }) => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(data?.unreadCount || 0);
    });

    newSocket.on('notification:deleted', (data: { id: string; unreadCount: number }) => {
      if (data?.id) {
        setNotifications((prev) => prev.filter((n) => n.id !== data.id));
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      }
    });

    // Real-time Class & Assignment Event alerts
    newSocket.on('assignment:published', (data: { assignmentId: string; title: string; className: string }) => {
      toast.info(`New Assignment Published: ${data.title}`, {
        description: `Posted in class ${data.className}`,
      });
    });

    newSocket.on('submission:created', (data: { studentName: string; attemptNumber: number }) => {
      toast.info(`New Submission Received`, {
        description: `${data.studentName} submitted Attempt #${data.attemptNumber}`,
      });
    });

    newSocket.on('grade:published', (data: { assignmentTitle: string; grade: string; marks: number }) => {
      toast.success(`Grade Released: ${data.assignmentTitle}`, {
        description: `Grade: ${data.grade} (${data.marks} marks)`,
      });
    });

    newSocket.on('student_joined', (data: { studentName?: string; className?: string }) => {
      toast.info(`Student Enrolled`, {
        description: `${data.studentName || 'A new student'} joined the class`,
      });
    });

    newSocket.on('student_removed', (data: { className: string }) => {
      toast.warning(`Class Enrollment Update`, {
        description: `You were removed from ${data.className}`,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id, socketUrl, fetchNotifications]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        unreadCount,
        isLoadingNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchNotifications,
        joinClassRoom,
        leaveClassRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
