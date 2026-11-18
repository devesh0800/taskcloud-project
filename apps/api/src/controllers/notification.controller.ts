import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  /**
   * GET /api/v1/notifications
   * Get paginated notifications for the authenticated user
   */
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { page, limit, unreadOnly } = req.query;

      const result = await NotificationService.listByUser(userId, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        unreadOnly: unreadOnly === 'true',
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get total unread notifications count
   */
  static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const unreadCount = await NotificationService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark a single notification as read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;

      const updated = await NotificationService.markAsRead(id, userId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: updated,
      });
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
        });
        return;
      }
      next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/mark-all-read
   * Mark all notifications as read for authenticated user
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const result = await NotificationService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   * Delete a notification
   */
  static async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;

      await NotificationService.deleteNotification(id, userId);

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
}
