const bcrypt = require("bcrypt");
const saltRounds = 10;

// The comparePassword function compares the password in the request body with the hash in res.locals.hash
module.exports.comparePassword = function (req, res, next) {
    // Check password
    const callback = (err, isMatch) => {
        if (err) {
            console.error("Error bcrypt:", err);
            res.status(500).json(err);
        } else if (isMatch) {
                next();
            } else {
                res.status(401).json({
                    message: "Wrong password",
                });
            }
    };

    bcrypt.compare(req.body.password, res.locals.hash, callback);
};


// The hashPassword function hashes the password in the request body
module.exports.hashPassword = function (req, res, next) {
    // Check if the password is provided in the request body
    if (!req.body.password) {
        return res.status(400).json({ message: 'Password is required' });
    }

    // Hash the password
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        if (err) {
            console.error("Error bcrypt:", err);
            return res.status(500).json({ message: 'Error hashing password' });
        }

        // Store the hashed password in res.locals.hash
        res.locals.hash = hash;
        console.log(res.locals.hash)
        next();
    });
};
