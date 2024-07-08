window.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem("token");

    fetch('/saleOrders', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    .then(function (response) {
        return response.json();
    })
    .then(function (body) {
        if (body.error) throw new Error(body.error);
        const saleOrders = body.saleOrders;
        const tbody = document.querySelector("#product-tbody");
        saleOrders.forEach(function (saleOrder) {
            const row = document.createElement("tr");
            row.classList.add("product");
            const nameCell = document.createElement("td");
            const descriptionCell = document.createElement("td");
            const unitPriceCell = document.createElement("td");
            const quantityCell = document.createElement("td");
            const countryCell = document.createElement("td");
            const imageUrlCell = document.createElement("td");
            const orderId = document.createElement("td");
            const orderDatetimeCell = document.createElement("td");
            const statusCell = document.createElement("td");
            const createReviewCell = document.createElement("td");

            nameCell.textContent = saleOrder.name;
            descriptionCell.textContent = saleOrder.description;
            unitPriceCell.textContent = saleOrder.unitPrice;
            quantityCell.textContent = saleOrder.quantity;
            countryCell.textContent = saleOrder.country;
            imageUrlCell.innerHTML = `<img src="${saleOrder.imageUrl}" alt="Product Image">`;
            orderId.textContent = saleOrder.saleOrderId;
            orderDatetimeCell.textContent = new Date(saleOrder.orderDatetime).toLocaleString();
            statusCell.textContent = saleOrder.status;
            const viewProductButton = document.createElement("button");
            viewProductButton.textContent = "Create Review";
            viewProductButton.addEventListener('click', function () {
                const reviewProductSpan = document.querySelector("#review-product-id");
                reviewProductSpan.innerHTML = saleOrder.name;
                const productIdInput = document.querySelector("input[name='productId']");
                productIdInput.value = saleOrder.productId;
            });
            createReviewCell.appendChild(viewProductButton);

            row.appendChild(nameCell);
            row.appendChild(descriptionCell);
            row.appendChild(imageUrlCell);
            row.appendChild(unitPriceCell);
            row.appendChild(quantityCell);
            row.appendChild(countryCell);
            row.appendChild(orderId);
            row.appendChild(orderDatetimeCell);
            row.appendChild(statusCell);
            row.appendChild(createReviewCell);
            tbody.appendChild(row);
        });
    })
    .catch(function (error) {
        console.error(error);
    });

    const form = document.querySelector('form'); // Only have 1 form in this HTML
    form.onsubmit = function (e) {
        e.preventDefault(); // prevent using the default submit behavior

        const productId = form.querySelector('fieldset input[name=productId]').value;
        const rating = form.querySelector('fieldset input[name=rating]').value;
        const reviewText = form.querySelector('fieldset textarea[name=reviewText]').value;

        const allInput = form.querySelectorAll('input, button[type=submit]');
        // Disable inputs
        allInput.forEach((input) => {
            input.disabled = true;
        });

        const token = localStorage.getItem('token');
        localStorage.setItem('token', token);

        return fetch('/reviews', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productId: productId,
                rating: rating,
                reviewText: reviewText
            }),
        })
        .then(function (response) {
            // If not successful (i.e. there's error)
            if (response.status !== 201) return response.json(); // parse body as JSON string

            // Clear inputs
            allInput.forEach((input) => {
                if (input.type !== 'submit') input.value = '';
            });

            alert("Review created!"); // Enclose alert message in quotes
            // Success response has no body, hence next .then() will be null

            return null;
        })
        .then(function (body) {
            if (!body) return; // If successfully created, body will be empty
            alert(body.error); // else there's an error
        })
        .finally(function () {
            // Enable inputs
            allInput.forEach((input) => {
                input.disabled = false;
            });
        });
    };
});
