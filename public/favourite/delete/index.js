document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const listId = urlParams.get('id');

    if (!token || !listId) {
        console.error('Token or List ID not found');
        return;
    }

    document.getElementById('list-id').value = listId;

    document.getElementById('delete-confirm-form').addEventListener('submit', function (event) {
        event.preventDefault();

        fetch(`/favourite/removefromlist/${listId}`, { // Fixed URL format
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                alert('List deleted successfully!');
                window.location.href = '../../../favourite/'; // Redirect to the favorite lists page
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
    });
});
