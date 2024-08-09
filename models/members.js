const { query } = require('../database');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const POINTS_FOR_REFERRAL = 50;

// Function to generate a random referral code
function generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function registerUser({ username, email, password, dob, gender, referral_code }) {
    try {
        let referralUserId = null;

        // Check if the referral code exists
        if (referral_code) {
            const referrer = await prisma.member.findUnique({
                where: { referral_code: referral_code }
            });

            if (referrer) {
                referralUserId = referrer.id;
            } else {
                throw new Error('Invalid referral code.');
            }
        }

        // Generate a unique referral code for the new user
        const newUserReferralCode = generateReferralCode();

        // Create the new user
        const newUser = await prisma.member.create({
            data: {
                username,
                email,
                password, // The password should already be hashed before passing here
                dob: new Date(dob),
                gender,
                referral_code: newUserReferralCode,
                role: 1 // Default role as normal user
            }
        });

        // Handle referral points if the referral code was provided and valid
        if (referralUserId) {
            // Award points to the referrer
            await prisma.pointsBalance.upsert({
                where: { member_id: referralUserId },
                update: { points: { increment: POINTS_FOR_REFERRAL } },
                create: { member_id: referralUserId, points: POINTS_FOR_REFERRAL }
            });

            // Award points to the new user (referred user)
            await prisma.pointsBalance.create({
                data: {
                    member_id: newUser.id,
                    points: POINTS_FOR_REFERRAL
                }
            });

            // Create a referral record
            await prisma.referral.create({
                data: {
                    referrer_id: referralUserId,
                    referred_id: newUser.id,
                    referral_code: referral_code,
                    points_awarded: POINTS_FOR_REFERRAL
                }
            });
        } else {
            // If no referral code was used, just create the points balance with zero points
            await prisma.pointsBalance.create({
                data: {
                    member_id: newUser.id,
                    points: 0
                }
            });
        }

        return newUser;

    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
}


// Retrieve a user by email
async function retrieveByEmail(email) {
    const sql = 'SELECT * FROM member WHERE email = $1';
    const result = await query(sql, [email]);
    return result.rows[0];
}

// Function to assign referral codes to existing users
async function assignReferralCodesToExistingUsers() {
    try {
        // Fetch all users who do not have a referral code
        const usersWithoutReferralCode = await prisma.member.findMany({
            where: {
                referral_code: null,  // Only users without a referral code
            },
        });

        for (const user of usersWithoutReferralCode) {
            let referralCode;

            // Ensure the referral code is unique
            while (true) {
                referralCode = generateReferralCode();
                const existingUser = await prisma.member.findUnique({
                    where: { referral_code: referralCode },
                });
                if (!existingUser) break; // Exit loop if code is unique
            }

            // Assign the generated referral code to the user
            await prisma.member.update({
                where: { id: user.id },
                data: { referral_code: referralCode },
            });

            console.log(`Assigned referral code ${referralCode} to user ${user.username}`);
        }
    } catch (error) {
        console.error('Error assigning referral codes:', error);
        throw error;
    }
}

// Export the function along with the other module exports
module.exports = {
    isAdmin: function isAdmin(memberId) {
        const sql = `SELECT * FROM member m JOIN member_role r ON m.role=r.id WHERE m.id = $1 AND role = 2`;
        return query(sql, [memberId])
            .then(function (result) {
                const rows = result.rows;
                console.log(rows, rows.length);
                if (rows.length == 1) return true;
                return false;
            })
            .catch(function (error) {
                throw error;
            });
    },

    retrieveByUsername: function retrieveByUsername(username) {
        const sql = 'SELECT * FROM member WHERE username = $1';
        return query(sql, [username]).then(function (result) {
            const rows = result.rows;
            return rows[0];
        });
    },

    retrieveByEmail: retrieveByEmail,

    retrieveAgeGroupSpending: async function retrieveAgeGroupSpending(gender, minTotalSpending, minMemberTotalSpending) {
        const params = [gender, minTotalSpending, minMemberTotalSpending];
        const sql = 'SELECT * FROM get_age_group_spending($1, $2, $3);'

        try {
            console.log('Executing query:', sql, 'with params:', params);
            const result = await query(sql, params);
            console.log('Query result:', result.rows);
            return result.rows;
        } catch (error) {
            console.error('Error executing query:', error.message);
            throw error;
        }
    },

    generateCustomerLifetimeValue: function generateCustomerLifetimeValue() {
        const sql = 'CALL compute_customer_lifetime_value()';
        return query(sql)
            .then(function (result) {
                console.log('Calculating customer lifetime value');
            })
            .catch(function (error) {
                throw error;
            });
    },

    assignReferralCodesToExistingUsers: assignReferralCodesToExistingUsers,

    registerUser: registerUser,
};
