const { EMPTY_RESULT_ERROR, UNIQUE_VIOLATION_ERROR, DUPLICATE_TABLE_ERROR } = require('../errors');
const reviewsModel = require('../models/reviews');


// ##############################################################
// DEFINE CONTROLLER FUNCTION TO CREATE REVIEW
// ##############################################################
module.exports.createReview = function (req, res) {
    const productId = req.body.productId;
    const member_id = res.locals.member_id;
    const reviewText = req.body.reviewText;
    const rating = req.body.rating;

    return reviewsModel
        .createReview(productId, member_id, reviewText, rating)
        .then(function () {
            return res.sendStatus(201);
        })
        .catch(function (error) {
            console.error(error);
            if (error instanceof UNIQUE_VIOLATION_ERROR) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        });
}


// ##############################################################
// DEFINE CONTROLLER FUNCTION TO RETRIEVE ALL REVIEWS
// ##############################################################