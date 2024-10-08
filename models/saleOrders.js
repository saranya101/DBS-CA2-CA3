const { query } = require('../database');
const { EMPTY_RESULT_ERROR, SQL_ERROR_CODE, UNIQUE_VIOLATION_ERROR } = require('../errors');
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();


module.exports.retrieveAll = function retrieveAll(memberId) {
    let params = [];
    let sql = `SELECT * FROM sale_order_item s JOIN sale_order o ON s.sale_order_id=o.id JOIN product p ON s.product_id=p.id JOIN member m ON o.member_id=m.id`;
    if (memberId) {
        sql += ` WHERE o.member_id = $1`
        params.push(memberId);
    }
    return query(sql, params).then(function (result) {
        const rows = result.rows;

        if (rows.length === 0) {
            throw new EMPTY_RESULT_ERROR(`Sale Order not found!`);
        }

        return rows;
    });
};


module.exports = {
  // Function to retrieve all sale orders with optional filtering
  retrieveAllWithFilters: async function (filters) {
    try {
      const where = {}; // Initialize a where object for filters

      // Apply filters if they exist
      if (filters.status) {
        where.status = { in: filters.status.split(',') };
      }
      if (filters.minOrderDatetime) {
        where.order_datetime = { ...where.order_datetime, gte: new Date(filters.minOrderDatetime) };
      }
      if (filters.maxOrderDatetime) {
        where.order_datetime = { ...where.order_datetime, lte: new Date(filters.maxOrderDatetime) };
      }

      // Add filters for member username
      if (filters.username) {
        where.member = {
          username: { contains: filters.username, mode: 'insensitive' }
        };
      }
      // Add filters for member date of birth
      if (filters.minDob) {
        where.member = {
          ...where.member,
          dob: { ...where.member?.dob, gte: new Date(filters.minDob) }
        };
      }
      if (filters.maxDob) {
        where.member = {
          ...where.member,
          dob: { ...where.member?.dob, lte: new Date(filters.maxDob) }
        };
      }

      // Fetch sale orders with Prisma
      const saleOrders = await prisma.sale_order.findMany({
        where,
        include: {
          member: true, // Include member details
          sale_order_item: {
            include: {
              product: true // Include product details in sale_order_item
            }
          }
        },
        orderBy: {
          order_datetime: filters.sortOrder === 'desc' ? 'desc' : 'asc' // Order by datetime
        }
      });

      // Filter the sale orders based on the product-related filters
      const filteredSaleOrders = saleOrders.map(order => {
        const filteredItems = order.sale_order_item.filter(item => {
          let includeItem = true;

          // Apply quantity filters
          if (filters.minQuantity && item.quantity < parseInt(filters.minQuantity)) {
            includeItem = false;
          }
          if (filters.maxQuantity && item.quantity > parseInt(filters.maxQuantity)) {
            includeItem = false;
          }

          // Apply unit price filters
          if (filters.minUnitPrice && parseFloat(item.product.unit_price) < parseFloat(filters.minUnitPrice)) {
            includeItem = false;
          }
          if (filters.maxUnitPrice && parseFloat(item.product.unit_price) > parseFloat(filters.maxUnitPrice)) {
            includeItem = false;
          }

          // Apply product description filter
          if (filters.searchProductDescription && !item.product.description.toLowerCase().includes(filters.searchProductDescription.toLowerCase())) {
            includeItem = false;
          }

          return includeItem;
        });

        return {
          ...order,
          sale_order_item: filteredItems
        };
      }).filter(order => order.sale_order_item.length > 0);

      // Transform sale orders for easier use in the view
      return filteredSaleOrders.map(order => ({
        saleOrderId: order.id,
        orderDatetime: order.order_datetime,
        status: order.status,
        username: order.member?.username || 'Unknown',
        saleOrderItems: order.sale_order_item.map(item => ({
          name: item.product.name,
          description: item.product.description,
          unitPrice: item.product.unit_price,
          quantity: item.quantity,
          country: item.product.country,
          imageUrl: item.product.image_url,
          productType: item.product.product_type
        }))
      }));

    } catch (error) {
      console.error('Error retrieving sale orders:', error);
      throw error; // Re-throw error for controller to handle
    }
  }
};