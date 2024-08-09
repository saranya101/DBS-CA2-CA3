const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const POINTS_FOR_ENGAGEMENT = 10; // Adjust points as needed

module.exports.submitEngagement = async function (memberId, action, platform) {
    try {
        // Create the engagement
        const engagement = await prisma.socialMediaEngagement.create({
            data: {
                member_id: memberId,
                action: action,
                platform: platform,
                points: POINTS_FOR_ENGAGEMENT,
            },
        });

        // Award points to the user
        await prisma.pointsBalance.upsert({
            where: { member_id: memberId },
            update: { points: { increment: POINTS_FOR_ENGAGEMENT } }, // Increment the user's points
            create: { member_id: memberId, points: POINTS_FOR_ENGAGEMENT } // Create a new record if none exists
        });

        return engagement;
    } catch (error) {
        console.error('Error creating engagement:', error);
        throw error;
    }
};


module.exports.getAllEngagements = async function () {
    try {
        return await prisma.socialMediaEngagement.findMany({
            include: {
                member: true
            }
        });
    } catch (error) {
        console.error('Error retrieving engagements:', error);
        throw error;
    }
};

module.exports.updateEngagementStatus = async function (id, status) {
    try {
        return await prisma.socialMediaEngagement.update({
            where: { id: parseInt(id) },
            data: { status: status }
        });
    } catch (error) {
        console.error('Error updating engagement status:', error);
        throw error;
    }
};
