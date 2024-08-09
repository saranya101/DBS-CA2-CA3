const socialMediaModel = require('../models/social');

// In your controller function that handles the engagement submission
const POINTS_FOR_ENGAGEMENT = 10; // Define the points awarded per engagement



module.exports.submitEngagement = async function (req, res) {
    const memberId = res.locals.member_id; // Assuming the user is authenticated and their ID is stored here
    const { action, platform } = req.body;

    try {
        // Call the model to handle engagement creation and point awarding
        const engagement = await socialMediaModel.submitEngagement(memberId, action, platform);

        res.status(201).json({ message: 'Engagement submitted and approved successfully', engagement });
    } catch (error) {
        console.error('Error submitting engagement:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



module.exports.listEngagements = async function (req, res) {
    try {
        const engagements = await socialMediaModel.getAllEngagements();
        res.status(200).json(engagements);
    } catch (error) {
        console.error('Error listing engagements:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports.updateEngagement = async function (req, res) {
    const { id, status } = req.body;

    try {
        const engagement = await socialMediaModel.updateEngagementStatus(id, status);
        res.status(200).json({ message: 'Engagement status updated successfully', engagement });
    } catch (error) {
        console.error('Error updating engagement:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
