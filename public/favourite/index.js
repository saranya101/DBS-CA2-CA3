// index.js
window.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('Token not found in localStorage');
        return;
    }

    // Fetch favorite lists and their details
    function loadFavoriteLists() {
        fetch('/favourite/listswithcount', {
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
            const lists = data.favouriteLists || [];
            displayFavoriteLists(lists);
        })
        .catch(error => {
            console.error('Error fetching favorite lists:', error);
        });
    }

    // Function to display favorite lists
    function displayFavoriteLists(lists) {
        const listContainer = document.getElementById('list-container');
        listContainer.innerHTML = ''; // Clear existing content

        lists.forEach(list => {
            const listElement = document.createElement('div');
            listElement.classList.add('list-item');
            listElement.innerHTML = `
                <h2>${list.listName}</h2>
                <p><strong>Updated At:</strong> ${new Date(list.updatedAt).toLocaleDateString()}</p>
                <p><strong>Number of Products:</strong> ${list.productCount}</p>
                <button class="view-btn" data-list-id="${list.list_id}">View</button>
                <button class="update-btn" data-list-id="${list.listId}">Update</button>
                <button class="delete-btn" data-list-id="${list.listId}">Delete</button>
            `;
            listContainer.appendChild(listElement);
        });

        // Add event listeners for the buttons
        addButtonEventListeners();
    }

    // Function to add event listeners to buttons
    function addButtonEventListeners() {
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', function () {
                const listId = this.getAttribute('data-list-id');
                window.location.href = `/favourite/view?id=${listId}`;
            });
        });

        document.querySelectorAll('.update-btn').forEach(button => {
            button.addEventListener('click', function () {
                const listId = this.getAttribute('data-list-id');
                window.location.href = `/favourite/update?id=${listId}`;
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function () {
                const listId = this.getAttribute('data-list-id');
                if (confirm('Are you sure you want to delete this list?')) {
                    fetch(`/favourite/delete?id=${listId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => {
                        if (response.ok) {
                            alert('List deleted successfully!');
                            loadFavoriteLists(); // Reload the lists
                        } else {
                            return response.json().then(data => {
                                throw new Error(data.error || 'Error deleting list');
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error deleting list:', error);
                        alert(`Error deleting list: ${error.message}`);
                    });
                }
            });
        });
    }

    // Load the favorite lists on page load
    loadFavoriteLists();
});
