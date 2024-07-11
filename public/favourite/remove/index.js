window.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const listId = urlParams.get('listId'); // Fetch 'listId' parameter from URL
    const productId = urlParams.get('productId'); // Fetch 'productId' parameter from URL

    console.log('Full URL:', window.location.href);
    console.log('URL Search Params:', window.location.search);
    console.log('Retrieved listId:', listId); // Debugging
    console.log('Retrieved productId:', productId); // Debugging

    if (!token) {
        console.error('Token not found in localStorage');
        return;
    }

    if (!listId || !productId) {
        console.error('List ID or Product ID not found in URL');
        return;
    }

    // Ensure the elements exist before setting their values
    const listIdElement = document.getElementById('list-id');
    const productIdElement = document.getElementById('product-id');
    if (listIdElement && productIdElement) {
        listIdElement.value = listId;
        productIdElement.value = productId;
    } else {
        console.error('Required elements not found');
        return;
    }

    // Handle the form submission for removing the product
    document.getElementById('delete-confirm-form').addEventListener('submit', function (e) {
        e.preventDefault();

        fetch(`/favourite/removefromlist/${listIdElement.value}/product/${productIdElement.value}`, {
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
            alert('Product removed successfully');
            window.location.href = '../../../favourite/'; // Redirect to the favorite lists page
        })
        .catch(error => {
            console.error('Error removing product:', error);
            alert(`Error removing product: ${error.message}`);
        });
    });

    // Handle the cancel button click
    document.getElementById('cancel-button').addEventListener('click', function () {
        window.location.href = '../../../favourite/'; // Redirect to the favorite lists page
    });
});
