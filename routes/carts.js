const express = require('express');
const cartController = require('../controllers/cartsController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

const router = express.Router();

// All routes in this file will use the jwtMiddleware to verify the token and check if the user is an admin.
// Here the jwtMiddleware is applied at the router level to apply to all routes in this file
// But you can also apply the jwtMiddleware to individual routes
// router.use(jwtMiddleware.verifyToken, jwtMiddleware.verifyIsAdmin);

router.use(jwtMiddleware.verifyToken);
router.post('/create', cartController.addToCart);
router.get('/cart-items', cartController.getCartItems);
router.put('/cart-items/:productId', cartController.updateCartSingleCartItem);
router.delete('/cart-items/:productId', cartController.deleteSingleCartItem);
router.get('/cart-summary', cartController.getCartSummary);
router.put('/cart-items', cartController.bulkUpdateCartItems);

// Route for bulk delete
router.delete('/cart-items', cartController.bulkDeleteCartItems);
router.get('/checkout', cartController.getCartItems);
router.post('/apply-coupon', cartController.applyCoupon);
router.get('/shipping-options', cartController.getShippingOptions);
module.exports = router;