window.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem("token");
    const cartProductId = localStorage.getItem("cartProductId");

    const productIdInput = document.querySelector("input[name='productId']");
    if (productIdInput) {
        productIdInput.value = cartProductId;
    } else {
        console.error('Product ID input element not found.');
    }

    // Define addCartForm here by selecting the form element with the correct ID
    const addCartForm = document.getElementById('add-cart-form'); // Ensure the ID matches your HTML

    if (!addCartForm) {
        console.error('Form element not found.');
        return;
    }

    addCartForm.onsubmit = function (e) {
        e.preventDefault(); // Prevent default form submission

        const productIdInput = document.getElementById('productId');
        const quantityInput = document.getElementById('quantity');

        const productId = parseInt(productIdInput.value, 10);
        const quantity = parseInt(quantityInput.value, 10);

        if (!productId || quantity <= 0) {
            alert("Product ID and Quantity must be provided.");
            return;
        }

        console.log('Adding product to cart with data:', {
            productId: productId,
            quantity: quantity
        });

        fetch('/carts/create', {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: productId,
                quantity: quantity
            }),
        })
        .then(function (response) {
            if (response.ok) {
                alert('Product added to cart successfully!');
                // Clear the input fields
                productIdInput.value = '';
                quantityInput.value = '';
                window.location.reload();
            } else {
                // Handle errors
                response.json().then(function (data) {
                    alert(`Error adding product to cart - ${data.error}`);
                });
            }
        })
        .catch(function (error) {
            console.error('Error adding product to cart:', error);
            alert('Error adding product to cart.');
        });
    };
});
