import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateUser);

router.get('/', ProfileController.getProfile);
router.patch('/', ProfileController.updateProfile);
router.patch('/password', ProfileController.updatePassword);

export default router;
