document.addEventListener('DOMContentLoaded', async () => {
  const applyCouponButton = document.getElementById('apply-coupon-button');
  if (applyCouponButton) {
    applyCouponButton.addEventListener('click', applyCoupon);
  }
  try {
    const token = getAuthToken(); // Get the token when the page loads
    const cartItems = await fetchCartItems(token);
    renderCartItems(cartItems, 0);
    await fetchShippingOptions(token); // Fetch shipping options

    // Add event listener to the shipping options dropdown
    const shippingSelect = document.getElementById('shipping-options');
    if (shippingSelect) {
      shippingSelect.addEventListener('change', () => updatePricesWithShipping(cartItems));
    }
  } catch (error) {
    console.error('Error fetching cart items or shipping options:', error);
  }
});

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
    renderCartItems(result.cartItems, result.totalDiscountedPrice);
  } else {
    alert(result.error);
  }
}

function renderCartItems(cartItems, totalDiscountedPrice) {
  const cartItemsContainer = document.getElementById('cart-items');
  cartItemsContainer.innerHTML = '';

  let totalQuantity = 0;
  let totalPrice = 0.0;
  let totalDiscountPrice = 0.0;
  let uniqueProducts = cartItems.length;

  cartItems.forEach(item => {
    totalQuantity += item.quantity;
    totalPrice += item.quantity * item.unitPrice;
    totalDiscountPrice += item.quantity * item.discountedPrice;

    const cartItemElement = document.createElement('div');
    cartItemElement.classList.add('cart-item');
    cartItemElement.innerHTML = `
      <img src="${item.imageUrl}" alt="${item.name}">
      <div class="cart-item-details">
        <h4>${item.name}</h4>
        <p>${item.description}</p>
      </div>
      <div class="cart-item-quantity">Quantity: ${item.quantity}</div>
      <div class="cart-item-price">Original Price: $${(item.quantity * item.unitPrice).toFixed(2)}</div>
      <div class="cart-item-discount-price">Discounted Price: $${(item.quantity * item.discountedPrice).toFixed(2)}</div>
    `;

    cartItemsContainer.appendChild(cartItemElement);
  });

  document.getElementById('total-quantity').textContent = totalQuantity;
  document.getElementById('total-price').textContent = totalPrice.toFixed(2);
  document.getElementById('total-discounted-price').textContent = totalDiscountPrice.toFixed(2);
  document.getElementById('total-unique-products').textContent = uniqueProducts;
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

// Function to update prices with selected shipping option
function updatePricesWithShipping(cartItems) {
  const shippingSelect = document.getElementById('shipping-options');
  const selectedOption = shippingSelect.options[shippingSelect.selectedIndex];
  const shippingCost = parseFloat(selectedOption.dataset.cost);

  let totalQuantity = 0;
  let totalPrice = 0.0;
  let totalDiscountPrice = 0.0;

  cartItems.forEach(item => {
    totalQuantity += item.quantity;
    totalPrice += item.quantity * item.unitPrice;
    totalDiscountPrice += item.quantity * item.discountedPrice;
  });

  totalPrice += shippingCost;
  totalDiscountPrice += shippingCost;

  document.getElementById('total-price').textContent = totalPrice.toFixed(2);
  document.getElementById('total-discounted-price').textContent = totalDiscountPrice.toFixed(2);
}
