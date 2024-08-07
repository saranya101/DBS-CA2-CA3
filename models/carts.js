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
            });
        }
    }).then(function (cartItem) {
        // Return the updated or new cart item
        return cartItem;
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
        unitPrice: cartItem.product.unitPrice,
        quantity: cartItem.quantity,
        subTotalPrice: cartItem.quantity * cartItem.product.unitPrice,
      }));
    });
  };


// ##############################################################
// DEFINE MODEL FUNCTION TO UPDATE THE QUANTITY
// ##############################################################
