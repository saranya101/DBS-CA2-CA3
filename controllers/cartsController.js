const { EMPTY_RESULT_ERROR, UNIQUE_VIOLATION_ERROR, DUPLICATE_TABLE_ERROR } = require('../errors');
const cartModel = require('../models/carts');

// ##############################################################
// DEFINE CONTROLLER FUNCTION TO ADD PRODUCT INTO MY CART
// ##############################################################
module.exports.addToCart = function (req, res) {
    // Retrieve member ID from res.locals (assuming it was set by previous middleware)
    const memberId = res.locals.member_id;
  
    // Parse product ID and quantity from request body
    const productId = parseInt(req.body.productId, 10);
    const quantity = parseInt(req.body.quantity, 10);
  
    // Validate inputs
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }
  
    // Use the model function to create or update the cart item
    cartModel.createSingleCartItem(memberId, productId, quantity)
      .then(function (cartItem) {
        // Return a 201 status and the cart item details to indicate success
        return res.status(201).json(cartItem);
      })
      .catch(function (error) {
        console.error('Error adding item to cart:', error);
  
        // Handle known Prisma errors
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            return res.status(400).json({ error: `Cart item for product ${productId} already exists.` });
          }
        }
  
        // Handle other errors
        return res.status(500).json({ error: 'Internal server error' });
      });
  };

// ##############################################################
// DEFINE CONTROLLER FUNCTION TO RETRIEVE ALL PRODUCTS
// ##############################################################

module.exports.getCartItems = function (req, res) {
    const memberId = res.locals.member_id; // Retrieve member ID from middleware
  
    // Use the model function to get all cart items
    cartModel.getAllCartItems(memberId)
      .then(productsInCart => {
        // Send the products in the cart as JSON
        res.status(200).json(productsInCart);
      })
      .catch(error => {
        console.error('Error retrieving products in cart:', error);
  
        // Handle other errors
        res.status(500).json({ error: 'Internal server error' });
      });
  };

  // ##############################################################
// DEFINE CONTROLLER FUNCTION TO RETRIEVE ALL PRODUCTS
// ##############################################################
