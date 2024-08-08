const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();


// ##############################################################
// DEFINE MODEL FUNCTION TO ADDING INTO CART
// ##############################################################


module.exports.createSingleCartItem = function createSingleCartItem(memberId, productId, quantity) {
  return prisma.cartItem.findUnique({
    where: {
      memberId_productId: {
        memberId,
        productId,
      },
    },
  }).then(function (existingCartItem) {
    if (existingCartItem) {
      // Update the existing cart item with the new quantity
      return prisma.cartItem.update({
        where: {
          id: existingCartItem.id,
        },
        data: {
          quantity: existingCartItem.quantity + quantity,
          updatedAt: new Date(),
        },
        include: {
          product: true,
        },
      });
    } else {
      // Create a new cart item
      return prisma.cartItem.create({
        data: {
          member: {
            connect: { id: memberId },
          },
          product: {
            connect: { id: productId },
          },
          quantity,
        },
        include: {
          product: true,
        },
      });
    }
  }).then(function (cartItem) {
    // Return the updated or new cart item with product details
    return {
      cartItemId: cartItem.id,
      productId: cartItem.product.id,
      name: cartItem.product.name,
      description: cartItem.product.description,
      country: cartItem.product.country,
      unitPrice: cartItem.product.unitPrice,
      quantity: cartItem.quantity,
      subTotalPrice: cartItem.quantity * cartItem.product.unitPrice,
    };
  }).catch(function (error) {
    // Handle Prisma Errors, specifically P2002 for unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error(`Cart item for product ${productId} already exists.`);
      }
    }
    throw error;
  });
};


// ##############################################################
// DEFINE MODEL FUNCTION TO RETRIEVE ALL PRODUCTS IN CART
// ##############################################################


module.exports.getAllCartItems = function getAllCartItems(memberId) {
  return prisma.cartItem.findMany({
    where: { memberId },
    include: {
      product: true, // Include product details
    },
  })
  .then(cartItems => {
    // Transform the cartItems to include only relevant details
    return cartItems.map(cartItem => ({
      cartItemId: cartItem.id,
      productId: cartItem.product.id,
      name: cartItem.product.name,
      description: cartItem.product.description,
      country: cartItem.product.country,
      unitPrice: cartItem.product.unit_price,
      quantity: cartItem.quantity,
      subTotalPrice: cartItem.quantity * cartItem.product.unit_price,
    }));
  });
};

module.exports.createSingleCartItem = function createSingleCartItem(memberId, productId, quantity) {
  return prisma.cartItem.findUnique({
    where: {
      memberId_productId: {
        memberId,
        productId,
      },
    },
  }).then(function (existingCartItem) {
    if (existingCartItem) {
      // Update the existing cart item with the new quantity
      return prisma.cartItem.update({
        where: {
          id: existingCartItem.id,
        },
        data: {
          quantity: existingCartItem.quantity + quantity,
          updatedAt: new Date(),
        },
        include: {
          product: true,
        },
      });
    } else {
      // Create a new cart item
      return prisma.cartItem.create({
        data: {
          member: {
            connect: { id: memberId },
          },
          product: {
            connect: { id: productId },
          },
          quantity,
        },
        include: {
          product: true,
        },
      });
    }
  }).then(function (cartItem) {
    // Return the updated or new cart item
    return {
      cartItemId: cartItem.id,
      productId: cartItem.product.id,
      name: cartItem.product.name,
      description: cartItem.product.description,
      country: cartItem.product.country,
      unitPrice: cartItem.product.unit_price,
      quantity: cartItem.quantity,
      subTotalPrice: cartItem.quantity * cartItem.product.unit_price,
    };
  }).catch(function (error) {
    // Handle Prisma Errors, specifically P2002 for unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error(`Cart item for product ${productId} already exists.`);
      }
    }
    throw error;
  });
};




// ##############################################################
// DEFINE MODEL FUNCTION TO UPDATE THE QUANTITY
// ##############################################################

module.exports.updateCartSingleCartItem = function updateCartSingleCartItem(memberId, productId, quantity) {
    return prisma.cartItem.findUnique({
      where: {
        memberId_productId: {
          memberId,
          productId,
        },
      },
    })
      .then(function (cartItem) {
        if (!cartItem) {
          throw new Error(`Cart item for product ${productId} not found.`);
        }
  
        // Update the quantity of the cart item
        return prisma.cartItem.update({
          where: {
            id: cartItem.id,
          },
          data: {
            quantity: quantity,
            updatedAt: new Date(),
          },
        });
      })
      .catch(function (error) {
        // Handle any errors that occur during the update process
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // Handle specific Prisma errors if necessary
        }
        throw error;
      });
  };


  // ##############################################################
// DEFINE MODEL FUNCTION TO DELETE PRODUCT FROM CART
// ################################################################

module.exports.deleteSingleCartItem= function  deleteSingleCartItem(memberId, productId) {
    return prisma.cartItem.delete({
      where: {
        memberId_productId: {
          memberId,
          productId,
        },
      },
    }).catch(error => {
      console.error('Error deleting cart item:', error);
      throw error;
    });
  };




  module.exports.getCartSummary = function getCartSummary(memberId) {
    return prisma.cartItem.findMany({
      where: {
        memberId: memberId,
      },
      include: {
        product: true, // Include product details
      },
    }).then(cartItems => {
      // Calculate total quantity, total price, and unique products
      let totalQuantity = 0;
      let totalPrice = 0.0; // Start with a float
  
      cartItems.forEach(item => {
        totalQuantity += item.quantity;
        // Ensure unitPrice is a number before calculation
        const unitPrice = parseFloat(item.product.unit_price);
        if (!isNaN(unitPrice)) {
          totalPrice += item.quantity * unitPrice;
        } else {
          console.error(`Invalid unitPrice for product ${item.product.id}: ${item.product.unit_price}`);
        }
      });
  
      const uniqueProducts = cartItems.length; // Number of unique products
  
      // Return the summary as an object with totalPrice as a number
      return {
        totalQuantity: totalQuantity,
        totalPrice: totalPrice, // Ensure this is a number
        totalUniqueProducts: uniqueProducts
      };
    }).catch(error => {
      console.error('Error calculating cart summary:', error);
      throw error;
    });
  };

  module.exports.bulkUpdateCartItems = function bulkUpdateCartItems(memberId, items) {
    const updatePromises = items.map(item => {
        return prisma.cartItem.update({
            where: {
                memberId_productId: {
                    memberId: memberId,
                    productId: item.productId,
                },
            },
            data: {
                quantity: item.quantity,
            },
        });
    });

    return Promise.all(updatePromises);
};

module.exports.bulkDeleteCartItems = function bulkDeleteCartItems(memberId, productIds) {
    const deletePromises = productIds.map(productId => {
        return prisma.cartItem.delete({
            where: {
                memberId_productId: {
                    memberId: memberId,
                    productId: productId,
                },
            },
        });
    });

    return Promise.all(deletePromises);
};





// ##############################################################
//  CHECKOUT SECTION
// ##############################################################

module.exports.getCartItems = async function getCartItems(memberId) {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { memberId },
      include: {
        product: {
          include: {
            productDiscounts: true
          }
        }
      }
    });

    return cartItems.map(cartItem => {
      const discount = cartItem.product.productDiscounts.length > 0 ? cartItem.product.productDiscounts[0] : null;
      const discountedPrice = discount
        ? cartItem.product.unit_price * (1 - discount.discountPercentage / 100)
        : cartItem.product.unit_price;

      return {
        cartItemId: cartItem.id,
        productId: cartItem.product.id,
        name: cartItem.product.name,
        description: cartItem.product.description,
        country: cartItem.product.country,
        unitPrice: parseFloat(cartItem.product.unit_price.toFixed(2)),
        discountedPrice: parseFloat(discountedPrice.toFixed(2)),
        quantity: cartItem.quantity,
        imageUrl: cartItem.product.image_url
      };
    });
  } catch (error) {
    console.error('Error getting cart items:', error);
    throw error;
  }
};






module.exports.applyCoupon = async function applyCoupon(memberId, couponCode) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode }
  });

  if (!coupon) {
    throw new Error('Invalid coupon code');
  }

  const usedCoupon = await prisma.usedCoupon.findFirst({
    where: {
      couponId: coupon.id,
      memberId: memberId
    }
  });

  if (usedCoupon) {
    throw new Error('Coupon has already been used');
  }

  const cartItems = await this.getCartItems(memberId);
  const totalDiscountedPrice = cartItems.reduce((acc, item) => acc + item.discountedPrice * item.quantity, 0);

  if (totalDiscountedPrice < coupon.minPurchaseAmount) {
    throw new Error(`Coupon requires a minimum purchase of $${coupon.minPurchaseAmount.toFixed(2)}`);
  }

  const discountAmount = totalDiscountedPrice * (coupon.discountPercentage / 100);
  const finalDiscountedPrice = totalDiscountedPrice - discountAmount;

  // Update each cart item's discounted price to reflect the applied coupon
  const updatedCartItems = cartItems.map(item => {
    return {
      ...item,
      discountedPrice: item.discountedPrice * (1 - coupon.discountPercentage / 100)
    };
  });

  // Insert record into UsedCoupon table
  await prisma.usedCoupon.create({
    data: {
      couponId: coupon.id,
      memberId: memberId
    }
  });

  return {
    cartItems: updatedCartItems,
    totalDiscountedPrice: finalDiscountedPrice,
    alertMessage: 'Coupon applied successfully!'
  };
};


// ##############################################################
//  SHIPPING ORDERS
// ##############################################################

module.exports.getShippingOptions = async function () {
  try {
    const shippingOptions = await prisma.shipping_method.findMany();
    return shippingOptions;
  } catch (error) {
    console.error('Error retrieving shipping options:', error);
    throw error;
  }
};