window.addEventListener('DOMContentLoaded', function () {
    // Retrieve token from localStorage
    const token = localStorage.getItem('token');

    // Get list ID from the URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const listId = urlParams.get('id');

    // Check if token and listId are available
    if (!token) {
        console.error('Token not found in localStorage.');
        alert('You must be logged in to update a list.');
        return;
    }
    if (!listId) {
        console.error('List ID not found in URL.');
        alert('List ID is missing.');
        return;
    }

    const form = document.getElementById('update-list-form');
    const listNameInput = document.getElementById('list-name');

    if (!form || !listNameInput) {
        console.error('Form or List Name Input not found.');
        return;
    }

    // Fetch current list name and populate the input field
    function loadCurrentListName() {
        fetch(`/favourite/lists/${listId}`, {
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
            if (data && data.list_name) {
                listNameInput.value = data.list_name;
            } else {
                console.error('Invalid response data');
            }
        })
        .catch(error => {
            console.error('Error fetching list name:', error);
        });
    }

    // Handle form submission to update the list name
    form.onsubmit = function (e) {
        e.preventDefault(); // Prevent default form submission

        const newListName = listNameInput.value;

        if (!newListName) {
            alert('List name cannot be empty.');
            return;
        }

        fetch(`/favourite/${listId}`, {
            method: 'PUT', // Use PUT for updates
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ list_name: newListName })
        })
        .then(response => {
            if (response.ok) {
                alert('List name updated successfully!');
                window.location.reload(); // Reload to reflect changes
            } else {
                return response.json().then(data => {
                    throw new Error(data.error || 'Error updating list name');
                });
            }
        })
        .catch(error => {
            console.error('Error updating list name:', error);
            alert(`Error updating list name: ${error.message}`);
        });
    };

    // Load the current list name when the page loads
    loadCurrentListName();
});
