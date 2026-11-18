import { prisma } from '../config/prisma';
import { Notification } from '@prisma/client';
import { broadcastNotification, emitToUser } from '../sockets/socket.server';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: string;
  entityId?: string;
  link?: string;
}

export interface ListNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class NotificationService {
  /**
   * Create a single notification in Neon PostgreSQL and broadcast real-time socket event
   */
  static async createNotification(data: CreateNotificationInput): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        entityId: data.entityId || null,
        link: data.link || null,
      },
    });

    // Real-time broadcast
    await broadcastNotification(notification);

    return notification;
  }

  /**
   * Alias for backward compatibility
   */
  static async sendNotification(data: CreateNotificationInput): Promise<Notification> {
    return this.createNotification(data);
  }

  /**
   * Create batch notifications for multiple users (e.g. all enrolled students in a class)
   */
  static async createBatchNotifications(
    recipientIds: string[],
    data: Omit<CreateNotificationInput, 'userId'>
  ): Promise<void> {
    if (!recipientIds || recipientIds.length === 0) return;

    // Remove duplicates
    const uniqueIds = Array.from(new Set(recipientIds));

    // Batch insert into database
    await prisma.notification.createMany({
      data: uniqueIds.map((userId) => ({
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        entityId: data.entityId || null,
        link: data.link || null,
      })),
    });

    // Fetch and broadcast individually so each user gets real-time toast and unread count update
    const createdNotifications = await prisma.notification.findMany({
      where: {
        userId: { in: uniqueIds },
        title: data.title,
        type: data.type,
      },
      orderBy: { createdAt: 'desc' },
      take: uniqueIds.length,
    });

    for (const notif of createdNotifications) {
      await broadcastNotification(notif);
    }
  }

  /**
   * List paginated notifications for an authenticated user
   */
  static async listByUser(
    userId: string,
    options: ListNotificationsOptions = {}
  ): Promise<PaginatedNotifications> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };
    if (options.unreadOnly) {
      whereClause.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Mark a specific notification as read (with user authorization check)
   */
  static async markAsRead(id: string, userId: string): Promise<Notification> {
    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new Error('Notification not found or access denied');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    emitToUser(userId, 'notification:updated', {
      id: updated.id,
      isRead: true,
      unreadCount,
    });

    return updated;
  }

  /**
   * Mark all unread notifications for a user as read
   */
  static async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    emitToUser(userId, 'notification:all_read', {
      unreadCount: 0,
      updatedCount: result.count,
    });

    return { updatedCount: result.count };
  }

  /**
   * Delete a notification (with user authorization check)
   */
  static async deleteNotification(id: string, userId: string): Promise<boolean> {
    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      throw new Error('Notification not found or access denied');
    }

    await prisma.notification.delete({
      where: { id },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    emitToUser(userId, 'notification:deleted', {
      id,
      unreadCount,
    });

    return true;
  }

  /**
   * Get unread count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
