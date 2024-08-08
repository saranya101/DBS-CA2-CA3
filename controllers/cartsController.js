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
  
  if (!memberId) {
    return res.status(400).json({ error: 'Member ID is missing' });
  }

  // Use the model function to get all cart items
  cartModel.getAllCartItems(memberId)
    .then(productsInCart => {
      // Log the products in the cart
      console.log('Products in cart:', productsInCart);
      
      // Send the products in the cart as JSON
      res.status(200).json(productsInCart);
    })
    .catch(error => {
      console.error('Error retrieving products in cart:', error);
  
      // Handle other errors
      res.status(500).json({ error: 'Internal server error' });
    });
};

module.exports.addToCart = function (req, res) {
  const memberId = res.locals.member_id;
  const productId = parseInt(req.body.productId, 10);
  const quantity = parseInt(req.body.quantity, 10);

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid product ID or quantity' });
  }

  // Use the model function to create or update the cart item
  cartModel.createSingleCartItem(memberId, productId, quantity)
    .then(cartItem => {
      // Return a 201 status and the cart item details to indicate success
      return res.status(201).json(cartItem);
    })
    .catch(error => {
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
// DEFINE CONTROLLER FUNCTION TO UPDATE QUANTITY OF PRODUCT
// ################################################################

module.exports.updateCartSingleCartItem = function (req, res) {
    // Retrieve member ID from res.locals (assuming it was set by previous middleware)
    const memberId = res.locals.member_id;
  
    // Parse product ID from request parameters
    const productId = parseInt(req.params.productId, 10);
  
    // Parse quantity from request body
    const quantity = parseInt(req.body.quantity, 10);
  
    // Validate inputs
    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }
  
    // Use the model function to update the quantity of the cart item
    cartModel.updateCartSingleCartItem(memberId, productId, quantity)
      .then(function (updatedCartItem) {
        // Return a 200 status and the updated cart item details to indicate success
        return res.status(200).json(updatedCartItem);
      })
      .catch(function (error) {
        console.error('Error updating cart item quantity:', error);
  
        // Handle errors appropriately
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
  
        return res.status(500).json({ error: 'Internal server error' });
      });
  };


  // ##############################################################
// DEFINE CONTROLLER FUNCTION TO UPDATE QUANTITY OF PRODUCT
// ################################################################
  module.exports. deleteSingleCartItem = function (req, res) {
    const memberId = res.locals.member_id; // Assuming member ID is stored in res.locals by middleware
    const productId = parseInt(req.params.productId, 10);
  
    // Validate input
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
  
    cartModel.deleteSingleCartItem(memberId, productId)
      .then(() => {
        res.status(204).send(); // Send a 204 No Content status to indicate successful deletion
      })
      .catch(error => {
        console.error('Error deleting cart item:', error);
  
        // Handle errors appropriately
        if (error.code === 'P2025') { // Prisma error code for record not found
          return res.status(404).json({ error: 'Cart item not found' });
        }
  
        res.status(500).json({ error: 'Internal server error' });
      });
  };




  module.exports.getCartSummary = function (req, res) {
    const memberId = res.locals.member_id; // Assuming member ID is stored in res.locals by middleware
    
    if (!memberId) {
      return res.status(400).json({ error: 'Member ID is missing' });
    }
  
    cartModel.getCartSummary(memberId)
      .then(summary => {
        // Send the summary as a JSON response with totalPrice as a number
        res.status(200).json({
          totalQuantity: summary.totalQuantity,
          totalPrice: parseFloat(summary.totalPrice), // Convert to number just in case
          totalUniqueProducts: summary.totalUniqueProducts
        });
      })
      .catch(error => {
        console.error('Error retrieving cart summary:', error);
        res.status(500).json({ error: 'Internal server error' });
      });
  };


  module.exports.bulkUpdateCartItems = async function (req, res) {
    const updates = req.body; // Expecting an array of { productId, quantity }
    const memberId = res.locals.member_id;
  
    try {
      const updatePromises = updates.map(item =>
        prisma.cartItem.update({
          where: {
            memberId_productId: {
              memberId: memberId,
              productId: parseInt(item.productId, 10),
            },
          },
          data: {
            quantity: item.quantity,
          },
        })
      );
  
      await Promise.all(updatePromises);
      res.status(200).json({ message: 'Bulk update successful' });
    } catch (error) {
      console.error('Error performing bulk update:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  module.exports.bulkDeleteCartItems = async function (req, res) {
    const productIds = req.body.productIds; // Expecting an array of productIds
    const memberId = res.locals.member_id;
  
    try {
      const deletePromises = productIds.map(id =>
        prisma.cartItem.delete({
          where: {
            memberId_productId: {
              memberId: memberId,
              productId: parseInt(id, 10),
            },
          },
        })
      );
  
      await Promise.all(deletePromises);
      res.status(204).send(); // No content
    } catch (error) {
      console.error('Error performing bulk delete:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  






// ##############################################################
//  CHECKOUT SECTION
// ##############################################################

module.exports.getCartItems = async function (req, res) {
  const memberId = res.locals.member_id;

  try {
    const cartItems = await cartModel.getCartItems(memberId);
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Error retrieving cart items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};




module.exports.applyCoupon = async function (req, res) {
  const memberId = res.locals.member_id;
  const { couponCode } = req.body;

  try {
    const { cartItems, totalDiscountedPrice, alertMessage } = await cartModel.applyCoupon(memberId, couponCode);
    res.status(200).json({ success: true, cartItems, totalDiscountedPrice, alertMessage });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};
