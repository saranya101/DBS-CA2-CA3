const memberModel = require('../models/members');

module.exports.login = function (req, res, next) {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ message: 'Account Number and password are required' });
    }

    memberModel.retrieveByUsername(username)
        .then(function (member) {
            if (!member) {
                return res.status(401).json({ message: 'Invalid Account Number or password' });
            }
            res.locals.hash = member.password;
            res.locals.username = member.username;
            res.locals.member_id = member.id;
            res.locals.role = member.role;
            next();
        })
        .catch(function (error) {
            return res.status(500).json({ message: error.message });
        });
};

module.exports.retrieveAgeGroupSpending = async function (req, res) {
    const gender = req.query.gender || null;
    const minTotalSpending = req.query.minTotalSpending ? parseFloat(req.query.minTotalSpending) : 0;
    const minMemberTotalSpending = req.query.minMemberTotalSpending ? parseFloat(req.query.minMemberTotalSpending) : 0;

    console.log('Received request with params:', { gender, minTotalSpending, minMemberTotalSpending });

    try {
        const result = await memberModel.retrieveAgeGroupSpending(gender, minTotalSpending, minMemberTotalSpending);
        console.log('Sending response:', result);
        res.json({ spendings: result });
    } catch (error) {
        console.error('Error in retrieveAgeGroupSpending controller:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports.generateCustomerLifetimeValue = function (req, res) {
    return memberModel.generateCustomerLifetimeValue()
        .then(function(result){
            return res.json({ message: "Generating CLV" });
        })
        .catch(function(error){
            console.error(error);
            res.status(500).send({ error: error.message });
        });
};

module.exports.assignReferralCodes = async function (req, res) {
    try {
        await memberModel.assignReferralCodesToExistingUsers();
        res.json({ message: 'Referral codes assigned to all users.' });
    } catch (error) {
        console.error('Error assigning referral codes:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


module.exports.registerUser = async function (req, res) {
    const { username, email, dob, gender, referral_code } = req.body;
    const password = res.locals.hash; // Use the hashed password from bcryptMiddleware

    // Basic validation
    if (!username || !email || !password || !dob || !gender) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Register the new user with the provided information
        const newUser = await memberModel.registerUser({ username, email, password, dob, gender, referral_code });
        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error('Error in register controller:', error.message);
        if (error.statusCode) {
            res.status(error.statusCode).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
};

// Function to generate a random referral code
function generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}
