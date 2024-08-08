const { EMPTY_RESULT_ERROR, UNIQUE_VIOLATION_ERROR, DUPLICATE_TABLE_ERROR } = require('../errors');
const saleOrdersModel = require('../models/saleOrders');
const membersModel = require('../models/members');

module.exports.retrieveAll = function (req, res) {
    let memberId = res.locals.member_id;

    membersModel
        .isAdmin(memberId)
        .then(function (isAdmin) {
            if (isAdmin) {
                memberId = null;
            }

            return saleOrdersModel.retrieveAll(memberId);
        })
        .then(function (saleOrders) {
            return res.json({ saleOrders: saleOrders });
        })
        .catch(function (error) {
            console.error(error);
            if (error instanceof EMPTY_RESULT_ERROR) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        });

}


module.exports.retrieveAllWithFilters = async function (req, res) {
    try {
        const filters = req.body; // Get filters from request body
        const saleOrders = await saleOrdersModel.retrieveAllWithFilters(filters);
        res.json({ saleOrders }); // Respond with sale orders
    } catch (error) {
        console.error('Error retrieving sale orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  };