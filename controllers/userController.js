const userModel = require('../models/user');

module.exports.getCurrentUser = async function (req, res) {
    try {
        const userId = res.locals.member_id; // Assuming member_id is stored in res.locals after JWT verification or session handling
        const user = await userModel.getUserById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error in getCurrentUser controller:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
