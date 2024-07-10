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

