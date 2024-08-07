const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Controller function to add or update an item in the cart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
module.exports.addToCart = function (req, res) {
    // Retrieve member ID from res.locals (assuming it was set by previous middleware)
    const memberId = res.locals.member_id;

    // Parse product ID and quantity from query parameters
    const productId = parseInt(req.body.productId, 10);
    const quantity = parseInt(req.body.quantity, 10);

    // Validate inputs
    if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }

    // Proceed with finding or creating the cart item
    return prisma.cartItem
        .findUnique({
            where: {
                memberId_productId: {
                    memberId,
                    productId,
                },
            },
        })
        .then(function (existingCartItem) {
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
        })
        .then(function (cartItem) {
            // Return a 201 status to indicate the item was successfully added or updated
            return res.sendStatus(201);
        })
        .catch(function (error) {
            console.error(error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(400).json({ error: `Cart item for product ${productId} already exists.` });
            }
            return res.status(500).json({ error: 'Internal server error' });
        });
};
