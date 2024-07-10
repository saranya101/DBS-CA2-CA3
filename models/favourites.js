const { query } = require('../database');

// ##############################################################
// DEFINE MODEL FUNCTION TO CREATING FAVOURITE LISTS
// ##############################################################

module.exports.createFavouriteList = function createFavouriteList(member_id,list_name) {
    console.log('Parameters received:', {member_id,list_name});

    if (!member_id || !list_name) {
        console.error('Error: All parameters must be provided');
        throw new Error('All parameters must be provided');
    }
        const sql = `SELECT * FROM create_favourite_list($1, $2)`;
        return query(sql, [member_id,list_name])
            .then(function (result) {
                const rows = result.rows;
                console.log(rows); // For debugging purposes
                return rows; // Return all rows
            });
};


// ##############################################################
// DEFINE MODEL FUNCTION TO RETRIEVING ALL LISTS
// ##############################################################

