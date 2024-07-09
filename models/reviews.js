const { query } = require('../database');
const { EMPTY_RESULT_ERROR, SQL_ERROR_CODE, UNIQUE_VIOLATION_ERROR } = require('../errors');



// ##############################################################
// DEFINE MODEL FUNCTION TO CREATE REVIEW
// ##############################################################

module.exports.createReview = function createReview(productId, member_id, reviewText, rating) {
    console.log('Parameters received:', { productId, member_id, reviewText, rating });

    if (!productId || !member_id || !reviewText || !rating) {
        console.error('Error: All parameters must be provided');
        throw new Error('All parameters must be provided');
    }

    return query('CALL create_review($1::INT, $2::INT, $3::TEXT, $4::INT)', [productId, member_id, reviewText, rating])
        .then(function(result) {
            console.log('Review created successfully');
        })
        .catch(function(error) {
            if (error.code === SQL_ERROR_CODE.UNIQUE_VIOLATION) {
                throw new UNIQUE_VIOLATION_ERROR('Review for this product already exists! Cannot create duplicate.');
            }
            throw error;
        });
};



// ##############################################################
// DEFINE MODEL FUNCTION TO RETRIEVE ALL REVIEWS
// ##############################################################

module.exports.getAllReviews = function (member_id) {
    const sql = `SELECT * FROM get_all_reviews($1)`;
    return query(sql, [member_id])
        .then(function (result) {
            const rows = result.rows;
            console.log(rows); // For debugging purposes
            return rows; // Return all rows
        });
};


// ##############################################################
// DEFINE MODEL FUNCTION TO UPDATE REVIEW
// ##############################################################

module.exports.updateReview = function updateReview(reviewId, rating, reviewtext) {
    console.log('Parameters received:', {reviewId, rating, reviewtext});

    if (!reviewId || !rating || !reviewtext) {
        console.error('Error: All parameters must be provided');
        throw new Error('All parameters must be provided');
    }

    return query('CALL update_review($1::INT, $2::INT, $3::TEXT)', [reviewId, rating, reviewtext])
        .then(function (result) {
            console.log('Review updated successfully');
        })
        .catch(function (error) {
            console.error(error);
            if (error.code === 'SQL_ERROR_CODE.UNIQUE_VIOLATION') {
                throw new UNIQUE_VIOLATION_ERROR(`Review ${reviewId} does not exist!`);
            }
            throw error;
        });
};

