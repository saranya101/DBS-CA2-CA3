document.addEventListener('DOMContentLoaded', async () => {
  const applyCouponButton = document.getElementById('apply-coupon-button');
  if (applyCouponButton) {
    applyCouponButton.addEventListener('click', applyCoupon);
  }

  const applyPointsButton = document.getElementById('apply-points-button');
  if (applyPointsButton) {
    applyPointsButton.addEventListener('click', applyPoints);
  }

  try {
    const token = getAuthToken(); // Get the token when the page loads
    await fetchUserPoints(token); // Fetch and display user points
    const cartItems = await fetchCartItems(token);
    renderCartItems(cartItems, 0, 0);
    await fetchShippingOptions(token); // Fetch shipping options

    // Add event listener to the shipping options dropdown
    const shippingSelect = document.getElementById('shipping-options');
    if (shippingSelect) {
      shippingSelect.addEventListener('change', () => updatePricesWithShipping(cartItems, 0));
    }
  } catch (error) {
    console.error('Error fetching cart items, user points, or shipping options:', error);
  }
});

async function fetchUserPoints(token) {
  try {
    const response = await fetch('/carts/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user points');
    }

    const data = await response.json();
    const availablePointsElement = document.getElementById('available-points');
    if (availablePointsElement) {
      availablePointsElement.textContent = data.points;
    }
  } catch (error) {
    console.error('Error fetching user points:', error);
  }
}

async function fetchCartItems(token) {
  const response = await fetch('/carts/checkout', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Network response was not ok ' + response.statusText);
  }

  const cartItems = await response.json();
  if (!Array.isArray(cartItems)) {
    throw new TypeError('Expected an array of cart items');
  }

  return cartItems;
}

async function applyCoupon() {
  const token = getAuthToken(); // Get the token when applying the coupon
  const couponCode = document.getElementById('coupon-code').value;
  const response = await fetch('/carts/apply-coupon', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ couponCode })
  });

  const result = await response.json();
  if (result.success) {
    alert(result.alertMessage);

    // Render the cart items after coupon application
    renderCartItems(result.cartItems, result.totalDiscountedPrice, 0);

    // Update the prices with the selected shipping option using the updated cart items from the coupon
    const shippingSelect = document.getElementById('shipping-options');
    if (shippingSelect) {
      // Update shipping prices when the shipping option changes
      shippingSelect.addEventListener('change', () => updatePricesWithShipping(result.cartItems, 0)); // Pass updated cart items
    }

    // Initial call to update shipping prices with coupon-applied items
    updatePricesWithShipping(result.cartItems, 0); 
  } else {
    alert(result.error);
  }
}



function renderCartItems(cartItems = [], totalDiscountedPrice = 0, totalDiscountWithPoints = 0) {
  const cartItemsContainer = document.getElementById('cart-items');
  cartItemsContainer.innerHTML = '';

  let totalQuantity = 0;
  let totalPrice = 0.0;
  let totalDiscountPrice = 0.0;
  let uniqueProducts = cartItems.length;

  cartItems.forEach(item => {
    const product = item.product || item;
    
    const unitPrice = parseFloat(product.unit_price || product.unitPrice || 0);
    const imageUrl = product.image_url || product.imageUrl || '/images/default.png';
    const name = product.name || 'Product Name';
    const description = product.description || '';
    const quantity = item.quantity || 0;

    totalQuantity += quantity;
    totalPrice += quantity * unitPrice;

    // Determine the discounted price: Use provided discount, or calculate if necessary
    const discountedPrice = product.discountedPrice !== undefined
      ? parseFloat(product.discountedPrice) * quantity
      : quantity * unitPrice;  // Fallback if no discount is provided

    totalDiscountPrice += discountedPrice;

    const cartItemElement = document.createElement('div');
    cartItemElement.classList.add('cart-item');
    cartItemElement.innerHTML = `
      <img src="${imageUrl}" alt="${name}">
      <div class="cart-item-details">
        <h4>${name}</h4>
        <p>${description}</p>
      </div>
      <div class="cart-item-quantity">Quantity: ${quantity}</div>
      <div class="cart-item-price">Original Price: $${(quantity * unitPrice).toFixed(2)}</div>
      <div class="cart-item-discount-price">Discounted Price: $${discountedPrice.toFixed(2)}</div>
    `;

    cartItemsContainer.appendChild(cartItemElement);
  });

  document.getElementById('total-quantity').textContent = totalQuantity || 0;
  document.getElementById('total-price').textContent = totalPrice ? totalPrice.toFixed(2) : '0.00';
  document.getElementById('total-discounted-price').textContent = totalDiscountedPrice > 0 ? totalDiscountedPrice.toFixed(2) : totalDiscountPrice.toFixed(2);
  document.getElementById('total-unique-products').textContent = uniqueProducts || 0;
  document.getElementById('total-after-points').textContent = totalDiscountWithPoints > 0 ? totalDiscountWithPoints.toFixed(2) : totalDiscountPrice.toFixed(2);
}

// Function to get the authentication token
function getAuthToken() {
  return localStorage.getItem("token");
}

// Function to fetch and populate shipping options
async function fetchShippingOptions(token) {
  const response = await fetch('/carts/shipping-options', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Network response was not ok ' + response.statusText);
  }

  const shippingOptions = await response.json();
  const shippingSelect = document.getElementById('shipping-options');
  shippingOptions.forEach(option => {
    const cost = Number(option.cost); // Ensure cost is a number
    const opt = document.createElement('option');
    opt.value = option.id;
    opt.dataset.cost = cost; // Store the cost in a data attribute
    opt.textContent = `${option.name} - $${cost.toFixed(2)} (${option.deliveryTime})`;
    shippingSelect.appendChild(opt);
  });
}


function updatePricesWithShipping(cartItems, pointsApplied = 0, couponDiscount = 0) {
  const shippingSelect = document.getElementById('shipping-options');
  const selectedOption = shippingSelect.options[shippingSelect.selectedIndex];
  const shippingCost = parseFloat(selectedOption.dataset.cost) || 0;  // Get the shipping cost

  let totalQuantity = 0;
  let totalPrice = 0.0;
  let totalDiscountPrice = 0.0;

  cartItems.forEach(item => {
    const unitPrice = parseFloat(item.unitPrice || item.product.unit_price || 0);
    const discountedPrice = parseFloat(item.discountedPrice || unitPrice);

    totalQuantity += item.quantity || 0;
    totalPrice += item.quantity * unitPrice;
    totalDiscountPrice += item.quantity * discountedPrice;
  });

  // Apply coupon discount first
  totalDiscountPrice -= couponDiscount;

  // Add the shipping cost to the total price before applying the discount
  const totalPriceWithShipping = totalPrice + shippingCost;

  // Now add the shipping cost to the total discounted price
  totalDiscountPrice += shippingCost;

  // Calculate the total after points are applied, including shipping but before discounts
  const totalAfterPoints = Math.max(0, totalDiscountPrice - pointsApplied);

  // Display the totals in the UI
  document.getElementById('total-price').textContent = totalPriceWithShipping.toFixed(2);  // Total Price with shipping before discounts
  document.getElementById('total-discounted-price').textContent = totalDiscountPrice.toFixed(2);  // Total Discounted Price with shipping
  document.getElementById('total-after-points').textContent = totalAfterPoints.toFixed(2);  // Total After Points Discount with shipping

  // Return calculated values for further use
  return { totalPriceWithShipping, totalDiscountPrice, totalAfterPoints };
}


