import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import * as conversionController from '../controllers/conversion.controller';
import * as userController from '../controllers/user.controller';
import * as adminController from '../controllers/admin.controller';
import * as feeCollectionController from '../controllers/fee-collection.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Payment routes
router.post('/payments', authenticate, paymentController.createPayment);
router.get('/payments/:id', authenticate, paymentController.getPayment);
router.get('/payments', authenticate, paymentController.getPaymentHistory);
router.post('/payments/:id/cancel', authenticate, paymentController.cancelPayment);

// Conversion routes
router.get('/conversions/rate', conversionController.getRate);
router.post('/conversions', authenticate, conversionController.createConversion);
router.get('/conversions/:id', authenticate, conversionController.getConversion);
router.get('/conversions', authenticate, conversionController.getConversionHistory);
router.post('/conversions/:id/execute', authenticate, conversionController.executeConversion);
router.post('/conversions/:id/cancel', authenticate, conversionController.cancelConversion);

// User routes
router.get('/users/me', authenticate, userController.getCurrentUser);
router.put('/users/me', authenticate, userController.updateUser);
router.get('/users/me/balance', authenticate, userController.getBalance);
router.get('/users/me/transactions', authenticate, userController.getTransactions);

// Admin routes
router.get('/admin/stats', authenticate, requireAdmin, adminController.getStats);
router.get('/admin/users', authenticate, requireAdmin, adminController.getUsers);
router.get('/admin/users/:id', authenticate, requireAdmin, adminController.getUser);
router.put('/admin/users/:id', authenticate, requireAdmin, adminController.updateUser);
router.get('/admin/payments', authenticate, requireAdmin, adminController.getPayments);
router.get('/admin/conversions', authenticate, requireAdmin, adminController.getConversions);

// Fee collection routes
router.get('/fees/stats', authenticate, requireAdmin, feeCollectionController.getFeeStats);
router.get('/fees/history', authenticate, requireAdmin, feeCollectionController.getFeeHistory);
router.post('/fees/collect', authenticate, requireAdmin, feeCollectionController.collectFees);

export default router;
