const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports.getUserById = async function getUserById(userId) {
    try {
        const user = await prisma.member.findUnique({
            where: {
                id: userId
            },
            include: {
                pointsBalance: true, // Include points balance
                referralsMade: {
                    include: {
                        referred: true // Include details of referred users
                    }
                },
                referralsReceived: {
                    include: {
                        referrer: true // Include details of referrers
                    }
                },
                favouritelists: {
                    include: {
                        favouritelistitems: {
                            include: {
                                product: true // Include product details in favourite list items
                            }
                        }
                    }
                },
                reviews: true, // Include reviews made by the user
                sale_order: {
                    include: {
                        sale_order_item: {
                            include: {
                                product: true // Include product details in sale order items
                            }
                        }
                    }
                },
                socialMediaEngagements: true // Include social media engagements
            }
        });
        return user;
    } catch (error) {
        console.error('Error retrieving user:', error);
        throw error;
    }
};
