window.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem("token");

    fetchSaleOrders();

    const form = document.querySelector("#searchForm");
    const button = document.querySelector("#searchButton");

    function fetchSaleOrders(filters = {}) {
        fetch('/saleOrders/filter', { // Use the /filter route
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(filters)
        })
        .then(function (response) {
            if (!response.ok) throw new Error('Failed to fetch sale orders');
            return response.json();
        })
        .then(function (body) {
            if (body.error) throw new Error(body.error);
            const saleOrders = body.saleOrders;
            const tbody = document.querySelector("#product-tbody");
            tbody.innerHTML = "";
            saleOrders.forEach(function (saleOrder) {
                saleOrder.saleOrderItems.forEach(item => {
                    const row = document.createElement("tr");
                    row.classList.add("product");
                    const nameCell = document.createElement("td");
                    const descriptionCell = document.createElement("td");
                    const unitPriceCell = document.createElement("td");
                    const quantityCell = document.createElement("td");
                    const countryCell = document.createElement("td");
                    const imageUrlCell = document.createElement("td");
                    const orderIdCell = document.createElement("td");
                    const orderDatetimeCell = document.createElement("td");
                    const statusCell = document.createElement("td");
                    const productTypeCell = document.createElement("td");
                    const memberUsernameCell = document.createElement("td");

                    nameCell.textContent = item.name;
                    descriptionCell.textContent = item.description;
                    unitPriceCell.textContent = parseFloat(item.unitPrice).toFixed(2);
                    quantityCell.textContent = parseInt(item.quantity);
                    countryCell.textContent = item.country;
                    imageUrlCell.innerHTML = `<img src="${item.imageUrl}" alt="Product Image" width="100" height="100">`;
                    orderIdCell.textContent = saleOrder.saleOrderId;
                    orderDatetimeCell.textContent = new Date(saleOrder.orderDatetime).toLocaleString();
                    statusCell.textContent = saleOrder.status;
                    productTypeCell.textContent = item.productType;
                    memberUsernameCell.textContent = saleOrder.username;

                    row.appendChild(nameCell);
                    row.appendChild(descriptionCell);
                    row.appendChild(imageUrlCell);
                    row.appendChild(unitPriceCell);
                    row.appendChild(quantityCell);
                    row.appendChild(countryCell);
                    row.appendChild(orderIdCell);
                    row.appendChild(orderDatetimeCell);
                    row.appendChild(statusCell);
                    row.appendChild(productTypeCell);
                    row.appendChild(memberUsernameCell);
                    tbody.appendChild(row);
                });
            });
        })
        .catch(function (error) {
            alert('Error fetching sale orders: ' + error.message);
            console.error('Error fetching sale orders:', error);
        });
    }

    function handleFormSubmission(event) {
        event.preventDefault();

        const formElements = Array.from(form.elements);
        const formValues = formElements.reduce(function (values, element) {
            if (element.type !== "submit" && element.value) {
                values[element.name] = element.value;
            }
            return values;
        }, {});

        const status = Array.from(form.elements.status.options)
            .filter(function (option) {
                return option.selected;
            })
            .map(function (option) {
                return option.value;
            });

        const filters = { ...formValues, status: status.join(',') };

        fetchSaleOrders(filters);
    }

    button.addEventListener("click", handleFormSubmission);
});
