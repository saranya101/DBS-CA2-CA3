/**
 * Fetch and display all cart items from the server
 * @param {string} token - The JWT token for authentication
 */
function fetchCartItems(token) {
    // Fetch cart items from the server
    return fetch('/carts/cart-items', { // Make sure the endpoint matches your server's route
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch cart items'); // Handle non-OK HTTP responses
        }
        return response.json();
      })
      .then(cartItems => {
        if (!cartItems || !Array.isArray(cartItems)) {
          throw new Error('Invalid cart items format');
        }
  
        const tbody = document.querySelector("#cart-items-tbody");
        tbody.innerHTML = ""; // Clear existing table content to avoid duplicates
  
        // Iterate through each cart item and create a row in the table
        cartItems.forEach(cartItem => {
          const row = document.createElement("tr");
          row.classList.add("product");
  
          // Create table cells for each attribute of the cart item
          const descriptionCell = document.createElement("td");
          const countryCell = document.createElement("td");
          const quantityCell = document.createElement("td");
          const unitPriceCell = document.createElement("td");
          const subTotalCell = document.createElement("td");
          const updateButtonCell = document.createElement("td");
          const deleteButtonCell = document.createElement("td");
          const checkboxCell = document.createElement("td");
  
          // Create and append necessary elements for each cell
          const updateButton = document.createElement("button");
          const deleteButton = document.createElement("button");
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
  
          // Convert unitPrice to a number
          const unitPrice = parseFloat(cartItem.unitPrice);
  
          // Debug: Log the unitPrice
          console.log('Unit Price:', unitPrice, 'Type:', typeof unitPrice);
  
          // Populate the cells with data
          descriptionCell.textContent = cartItem.name; // Adjust attribute names as per your cart item object
          countryCell.textContent = cartItem.country;
          unitPriceCell.textContent = unitPrice.toFixed(2); // Use toFixed only on a number
          subTotalCell.textContent = (unitPrice * cartItem.quantity).toFixed(2);
  
          updateButton.textContent = "Update";
          deleteButton.textContent = "Delete";
  
          // Make quantityCell an editable input field
          const quantityInput = document.createElement("input");
          quantityInput.type = "number";
          quantityInput.min = 1; // Ensure the quantity is always positive
          quantityInput.value = cartItem.quantity;
          quantityInput.addEventListener("input", function () {
            // Only allow numeric values
            this.value = this.value.replace(/[^0-9]/g, "");
          });
          quantityCell.appendChild(quantityInput);
  
          updateButtonCell.appendChild(updateButton);
          deleteButtonCell.appendChild(deleteButton);
          checkboxCell.appendChild(checkbox);
  
          // Add event listener to updateButton
          updateButton.addEventListener("click", function () {
            const updatedQuantity = quantityInput.value;
            if (updatedQuantity <= 0) {
              alert("Quantity must be a positive number.");
              return;
            }
  
            const updatedCartItem = {
              quantity: Number(updatedQuantity),
              productId: cartItem.productId // Make sure you use the correct ID field
            };
  
            // Send a PUT request to update the cart item
            fetch('/carts/cart-items/' + cartItem.productId, { // Corrected endpoint
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify(updatedCartItem)
            })
              .then(response => {
                if (!response.ok) {
                  throw new Error('Failed to update cart item');
                }
                return response.json();
              })
              .then(() => {
                // Refresh the cart items to reflect the updated quantity
                fetchCartItems(token);
              })
              .catch(error => {
                console.error(error);
                alert("Error updating cart item.");
              });
          });
  
          // Add event listener to deleteButton
          deleteButton.addEventListener("click", function () {
            // Send a DELETE request to remove the cart item
            fetch('/carts/cart-items/' + cartItem.productId, { // Corrected endpoint
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`
              }
            })
              .then(response => {
                if (!response.ok) {
                  throw new Error('Failed to delete cart item');
                }
                // Refresh the cart items after deletion
                fetchCartItems(token);
              })
              .catch(error => {
                console.error(error);
                alert("Error deleting cart item.");
              });
          });
  
          // Append cells to the row
          row.appendChild(checkboxCell);
          row.appendChild(descriptionCell);
          row.appendChild(countryCell);
          row.appendChild(subTotalCell);
          row.appendChild(unitPriceCell);
          row.appendChild(quantityCell);
          row.appendChild(updateButtonCell);
          row.appendChild(deleteButtonCell);
  
          // Append the row to the table body
          tbody.appendChild(row);
        });
      })
      .catch(error => {
        console.error(error);
        alert("Failed to load cart items.");
      });
  }
  
  // Load cart items on page load
  window.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to access your cart.");
      return;
    }
  
    fetchCartItems(token).catch(error => {
      console.error(error);
    });
  });
  