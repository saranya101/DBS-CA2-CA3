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

module.exports.getAllReviews = function (req, res) {
    const member_id = res.locals.member_id;

    return reviewsModel.getAllReviews(member_id)
        .then(function (reviews) {
            // Send the reviews data as JSON response
            return res.json({ reviews });
        })
        .catch(function (error) {
            console.error(error);
            if (error instanceof EMPTY_RESULT_ERROR) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        });
};

// ##############################################################
// DEFINE CONTROLLER FUNCTION TO RETRIEVE ALL REVIEWS
// ##############################################################

module.exports.getSpecificReview = function (req, res) {
    const reviewId = req.params.reviewId;

    return reviewsModel
    .getSpecificReview(reviewId)
        .then(function (reviews) {
            // Send the reviews data as JSON response
            return res.json({ reviews });
        })
        .catch(function (error) {
            console.error(error);
            if (error instanceof EMPTY_RESULT_ERROR) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        });
};

// ##############################################################
// DEFINE CONTROLLER FUNCTION TO UPDATE REVIEW 
// ##############################################################


module.exports.updateReview = function (req, res) {
    const reviewId = req.params.reviewId;
    const rating = req.body.rating;
    const reviewtext = req.body.reviewText;
    

    reviewsModel.updateReview(reviewId, rating, reviewtext)
        .then(function () {
            console.log("Review Updated successfully!");
            return res.status(200).json({ msg: "Review updated successfully!" });
        })
        .catch(function (error) {
            console.error(error);
            if (error instanceof EMPTY_RESULT_ERROR) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        });
};


// ##############################################################
// DEFINE CONTROLLER FUNCTION TO DELETE REVIEW 
// ##############################################################

module.exports.deleteReview = function (req, res) {
    // Delete module by Code
    const reviewId = req.params.reviewId;
    return reviewsModel
        .deleteReview(reviewId)
        .then(function () {
            console.log("Review deleted succesfully!");
            return res.status(200).json({ msg: "deleted!" });
        })
        .catch(function (error) {
            console.error(error);
            if (error instanceof EMPTY_RESULT_ERROR) {
                // return res.status(404).json({ error: error.message });
                return res.status(404).json({ error: "No such review!" });
            }
            return res.status(500).json({ error: error.message });
        });
}
