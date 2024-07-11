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

module.exports.getAllLists = function getAllLists(member_id) {
    const sql = `SELECT * FROM get_favourite_lists($1)`;
    return query(sql, [member_id])
        .then(function (result) {
            const rows = result.rows;
            console.log(rows); // For debugging purposes
            return rows; // Return all rows
        });
};



// ##############################################################
// DEFINE MODEL FUNCTION TO INSERT PRODUCT INTO LIST
// ##############################################################

module.exports.addProduct = function addProduct(product_id, list_id) { // Use list_id
    console.log('Parameters received:', { product_id, list_id });

    if (!product_id || !list_id) {
        console.error('Error: All parameters must be provided');
        throw new Error('All parameters must be provided');
    }

    const sql = `SELECT * FROM insert_product_into_list($1, $2)`;
    return query(sql, [product_id, list_id]) // Call with list_id
        .then(function (result) {
            const rows = result.rows;
            console.log(rows); // For debugging purposes
            return rows; // Return all rows
        });
};

// ##############################################################
// DEFINE MODEL FUNCTION TO RETRIEVE ALL LISTS WITH COUNT 
// ##############################################################

module.exports.getAllListsWithCount = function getAllListsWithCount() {
    const sql = `SELECT * FROM getListsWithCounts()`;
    return query(sql)
        .then(function (result) {
            const rows = result.rows;
            console.log(rows); // For debugging purposes
            return rows; // Return all rows
        });
};