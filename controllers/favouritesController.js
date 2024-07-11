const { EMPTY_RESULT_ERROR, UNIQUE_VIOLATION_ERROR, DUPLICATE_TABLE_ERROR } = require('../errors');
const favouritesModel = require('../models/favourites');

// ##############################################################
// DEFINE CONTROLLER FUNCTION TO CREATING FAVOURITE LISTS
// ##############################################################

module.exports.createFavouriteList = function (req, res) {
    const member_id = res.locals.member_id;
    const list_name = req.body.list_name;

    return favouritesModel
        .createFavouriteList(member_id,list_name)
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
// DEFINE CONTROLLER FUNCTION TO RETRIEVING ALL LISTS
// ##############################################################


module.exports.getAllLists = function (req, res) {
    const member_id = res.locals.member_id;

    return favouritesModel.getAllLists(member_id)
        .then(function (favouriteLists) {
                return res.json({ favouriteLists });
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
// DEFINE CONTROLLER FUNCTION TO INSERTING PRODUCT INTO LIST
// ##############################################################

module.exports.addProduct = function (req, res) {
    const product_id = req.body.product_id;
    const list_id = req.body.list_id; // Use list_id

    if (!product_id || !list_id) {
        console.error('Error: All parameters must be provided');
        return res.status(400).json({ error: 'All parameters must be provided' });
    }

    return favouritesModel
        .addProduct(product_id, list_id) // Call with list_id
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
};
