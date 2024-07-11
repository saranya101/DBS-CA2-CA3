window.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const listId = urlParams.get('id'); // Fetch the 'id' parameter from URL

    console.log('Full URL:', window.location.href);
    console.log('URL Search Params:', window.location.search);
    console.log('Retrieved listId:', listId); // Debugging

    if (!token) {
        console.error('Token not found in localStorage');
        return;
    }

    if (!listId) {
        console.error('List ID not found in URL');
        return;
    }

    // Ensure the element exists before setting its value
    const listIdElement = document.getElementById('list-id');
    if (listIdElement) {
        listIdElement.value = listId;
    } else {
        console.error('Element with id "list-id" not found');
    }

    // Fetch products for the list
    function loadProductsInList() {
        const endpoint = `/favourite/lists/${listId}`; // Ensure this matches your backend route
        fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched data:', data); // For debugging
            if (!data || !data.products) {
                throw new Error('Invalid response format: missing products');
            }
            displayProducts(data.products);
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            // Handle the error gracefully, e.g., display an error message to the user
        });
    }

    // Function to display products
    function displayProducts(products) {
        const productContainer = document.getElementById('products-container');
        if (!productContainer) {
            console.error('Element with id "products-container" not found');
            return;
        }

        productContainer.innerHTML = ''; // Clear existing content
        products.forEach(product => {
            const productElement = document.createElement('div');
            productElement.classList.add('product-item');
            productElement.innerHTML = `
                <h2>${product.productName || 'N/A'}</h2>
                <p><strong>Description:</strong> ${product.productDescription || 'No description available'}</p>
                <p><strong>Unit Price:</strong> $${(product.productUnitPrice || 0).toFixed(2)}</p>
                <p><strong>Stock Quantity:</strong> ${product.productStockQuantity || 0}</p>
                <p><strong>Country:</strong> ${product.productCountry|| 'Unknown'}</p>
                <p><strong>Product Type:</strong> ${product.productType|| 'Not specified'}</p>
                <img src="${product.productImageUrl || 'default-image.jpg'}" alt="${product.product_name || 'Product Image'}" />
                <p><strong>Manufactured On:</strong> ${product.productManufacturedOn}</p>
                <button class="remove-btn" data-product-id="${product.productId}">Remove from List</button>
            `;
            productContainer.appendChild(productElement);
        });

        // Add event listeners to the remove buttons
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', function () {
                const productId = this.getAttribute('data-product-id');
                removeProductFromList(productId);
            });
        });
    }

    // Function to remove a product from the list
    function removeProductFromList(productId) {
        const endpoint = `/favourite/lists/${listId}/product/${productId}`; // Adjust the endpoint according to your backend route
        fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Refresh the product list after successful removal
            loadProductsInList();
        })
        .catch(error => {
            console.error('Error removing product:', error);
        });
    }

    // Load products on page load
    loadProductsInList();
});
