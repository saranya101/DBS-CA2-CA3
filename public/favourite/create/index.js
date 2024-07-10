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

