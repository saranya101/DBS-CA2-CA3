const express = require('express');
const favouritesController = require('../controllers/favouritesController');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const router = express.Router();

// Apply JWT middleware to all routes in this file
router.use(jwtMiddleware.verifyToken);

// ##############################################################
// DEFINE ROUTES
// ##############################################################
router.post('/create-list', jwtMiddleware.verifyToken, favouritesController.createFavouriteList);
router.get('/lists', jwtMiddleware.verifyToken, favouritesController.getAllLists);
router.post('/add-product', jwtMiddleware.verifyToken, favouritesController.addProduct);
router.get('/listswithcount', jwtMiddleware.verifyToken, favouritesController.getAllListsWithCount);
router.get('/lists/:list_id', jwtMiddleware.verifyToken, favouritesController.getAllProducts);
router.put('/:list_id', jwtMiddleware.verifyToken, favouritesController.updateListName);
router.delete('/delete/:list_id', jwtMiddleware.verifyToken, favouritesController.deleteList);

module.exports = router;



