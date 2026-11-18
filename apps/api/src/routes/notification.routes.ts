import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All notification routes require authenticated session
router.use(authenticateUser);

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/mark-all-read', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markAsRead);
router.delete('/:id', NotificationController.deleteNotification);

export default router;
