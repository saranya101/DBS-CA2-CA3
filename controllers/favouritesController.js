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


// ##############################################################
// DEFINE CONTROLLER FUNCTION TO RETRIEVING ALL LISTS WITH INFO
// ##############################################################

module.exports.getAllListsWithCount = function (req, res) {

    return favouritesModel.getAllListsWithCount()
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
// DEFINE CONTROLLER FUNCTION TO UPDATE LISTNAME
// ##############################################################

module.exports.updateListName = function (req, res) {
    const list_id = req.params.list_id;
    const list_name = req.body.list_name;
    

    favouritesModel.updateListName(list_id, list_name)
        .then(function () {
            console.log("List name Updated successfully!");
            return res.status(200).json({ msg: "List name updated successfully!" });
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
// DEFINE CONTROLLER FUNCTION TO DELETE LIST 
// ##############################################################


module.exports.deleteList = function (req, res) {
    const list_id = req.params.list_id;
    return favouritesModel
        .deleteList(list_id)
        .then(function () {
            console.log("List deleted successfully!");
            return res.status(200).json({ msg: "List deleted!" });
        })
        .catch(function (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        });
}


// ##############################################################
// DEFINE CONTROLLER FUNCTION TO GET ALL PRODUCTS IN A LIST
// ##############################################################

module.exports.getAllProducts = function (req, res) {
    const listId = req.params.list_id; // Fetch listId from request parameters

    console.log('Received listId:', listId); // Debugging

    return favouritesModel.getAllProducts(listId)
        .then(function (products) {
            if (!products.length) {
                return res.status(404).json({ error: 'No products found for this list' });
            }
            return res.json({ products });
        })
        .catch(function (error) {
            console.error('Error fetching products:', error);
            return res.status(500).json({ error: error.message });
        });
};
