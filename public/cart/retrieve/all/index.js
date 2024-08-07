
function fetchCartItems(token) {
  // Fetch cart items from the server
  return fetch('/carts/cart-items', { // Ensure this endpoint matches your server's route
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
          const updatedQuantity = parseInt(quantityInput.value, 10);
          if (!Number.isInteger(updatedQuantity) || updatedQuantity <= 0) {
            alert("Quantity must be a positive number.");
            return;
          }

          const updatedCartItem = {
            quantity: updatedQuantity,
            productId: cartItem.productId // Ensure this ID is correct
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
              alert("Quantity updated successfully!");
            })
            .catch(error => {
              console.error(error);
              alert("Error updating cart item.");
            });
        });

        // Add event listener to deleteButton
        deleteButton.addEventListener("click", function () {
          if (!confirm("Are you sure you want to delete this item from your cart?")) {
            return;
          }

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
              alert("Item deleted successfully!");
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

      // Fetch and display the cart summary after loading the items
      return fetchCartSummary(token);
    })
    .catch(error => {
      console.error(error);
      alert("Failed to load cart items.");
    });
}

function fetchCartSummary(token) {
  // Fetch cart summary from the server
  return fetch('/carts/cart-summary', { // Ensure this endpoint matches your server's route
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch cart summary'); // Handle non-OK HTTP responses
      }
      return response.json();
    })
    .then(cartSummary => {
      const cartSummaryDiv = document.querySelector("#cart-summary");

      // Ensure totalPrice is treated as a number
      const totalPrice = parseFloat(cartSummary.totalPrice);

      // Display cart summary details
      cartSummaryDiv.innerHTML = `
        <h3>Cart Summary</h3>
        <p>Total Quantity: ${cartSummary.totalQuantity}</p>
        <p>Total Checkout Price: $${totalPrice.toFixed(2)}</p> <!-- Ensure this is a number -->
        <p>Total Unique Products: ${cartSummary.totalUniqueProducts}</p>
      `;
    })
    .catch(error => {
      console.error(error);
      alert("Failed to load cart summary.");
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
