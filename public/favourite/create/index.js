window.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem("token");
    const favouriteProductId = localStorage.getItem("favouriteProductId");

    const productIdInput = document.querySelector("input[name='productId']");
    productIdInput.value = favouriteProductId;    


});

window.addEventListener('DOMContentLoaded', function () {

    const token = localStorage.getItem('token');
    const memberId = localStorage.getItem('memberId'); // Assuming memberId is stored in local storage

    const createListForm = document.getElementById('create-new-list-form');

    if (!createListForm) {
        console.error('Form element not found.');
        return;
    }

    const newListNameInput = createListForm.querySelector('input[name=list_name]');

    if (!newListNameInput) {
        console.error('Required input element not found.');
        return;
    }

    createListForm.onsubmit = function (e) {
        e.preventDefault(); // prevent using the default submit behavior

        const newListName = newListNameInput.value;

        if (!newListName) {
            alert("List Name cannot be empty.");
            return;
        }

        console.log('Creating new list with data:', {
            memberId: memberId,
            listName: newListName
        });

        fetch('/favourite/create-list', {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                list_name: newListName
            }),
        })
        .then(function (response) {
            if (response.ok) {
                alert('New favorite list created!');
                // Clear the input field
                newListNameInput.value = "";
                window.location.reload();
            } else {
                // If fail, show the error message
                response.json().then(function (data) {
                    alert(`Error creating list - ${data.error}`);
                });
            }
        })
        .catch(function (error) {
            alert('Error creating list');
        });
    };
});



window.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('Token not found in localStorage');
        return;
    }

    const addToFavoriteForm = document.getElementById('add-to-favorite-form');
    const listSelect = document.getElementById('list-name');

    if (!addToFavoriteForm || !listSelect) {
        console.error('One or more required elements not found.');
        return;
    }

    // Load favorite lists and populate the dropdown
    function loadFavoriteLists() {
        fetch('/favourite/lists', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data && Array.isArray(data.favouriteLists)) {
                populateDropdown(data.favouriteLists);
            } else {
                console.error('Invalid response structure:', data);
            }
        })
        .catch(error => {
            console.error('Error fetching favorite lists:', error);
        });
    }

    function populateDropdown(favouriteLists) {
        listSelect.innerHTML = ''; // Clear existing options
        favouriteLists.forEach(list => {
            const option = document.createElement('option');
            option.value = list.listId; // Set the value to listId
            option.textContent = list.listName; // Display listName
            listSelect.appendChild(option);
        });
    }

    // Handle form submission for adding a product to a list
    addToFavoriteForm.onsubmit = function (e) {
        e.preventDefault(); // Prevent default form submission

        const productId = document.getElementById('productId').value;
        const listId = listSelect.value; // Get the selected list ID

        if (!productId || !listId) {
            alert("Both Product ID and List Name must be provided.");
            return;
        }

        fetch('/favourite/add-product', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_id: productId, list_id: listId }) // Send list_id to backend
        })
        .then(response => {
            if (response.ok) {
                alert('Product added to the list successfully!');
                document.getElementById('productId').value = '';
                listSelect.value = ''; // Reset the dropdown selection
                window.location.reload();
            } else {
                return response.json().then(data => {
                    throw new Error(data.error || 'Error adding product to list');
                });
            }
        })
        .catch(error => {
            console.error('Error adding product to list:', error);
            alert(`Error adding product to list: ${error.message}`);
        });
    };

    // Initial load of favorite lists
    loadFavoriteLists();
});
