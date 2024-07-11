function fetchReviews() {
    // Get token from localStorage
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('Token not found in localStorage');
        return Promise.reject('Token not found in localStorage');
    }

    return fetch(`/reviews`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(function (response) {
        console.log('Response received:', response);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .catch(function (error) {
        console.error('Error in fetch request:', error);
        throw error; // Rethrow the error to be handled by the caller
    });
}

window.addEventListener('DOMContentLoaded', function () {
    fetchReviews()
        .then(function (body) {
            if (!body || !body.reviews) {
                throw new Error('Invalid response structure');
            }

            const reviews = body.reviews;
            const reviewContainer = document.querySelector("#review-container");

            if (!reviewContainer) {
                console.error('Review container not found');
                return;
            }

            console.log(`Rendering ${reviews.length} reviews`);

            reviews.forEach(function (review) {
                const reviewElement = document.createElement("div");
                reviewElement.classList.add("review");

                reviewElement.innerHTML = `
                    <h2>Review ID: ${review.reviewid}</h2>
                    <p><strong>Product Name:</strong> ${review.productname}</p> 
                    <p><strong>Rating:</strong> ${'⭐'.repeat(review.rating)}</p>
                    <p><strong>Review Text:</strong> ${review.reviewtext}</p>
                    <p><strong>Review Date:</strong> ${new Date(review.updatedat).toLocaleDateString()}</p>
                    <button class="view-more-btn" data-review-id="${review.reviewid}">View More</button>
                    <button class="update-btn" data-review-id="${review.reviewid}">Update</button>
                    <button class="delete-btn" data-review-id="${review.reviewid}">Delete</button>
                `;

                reviewContainer.appendChild(reviewElement);
            });

            // Add event listeners for update, delete, and view more buttons
            document.querySelectorAll(".view-more-btn").forEach(function (button) {
                button.addEventListener("click", function () {
                    const reviewId = button.getAttribute("data-review-id");
                    console.log(`View More button clicked for review_id: ${reviewId}`);
                    localStorage.setItem("reviewId", reviewId);
                    window.location.href = `../one/index.html?id=${reviewId}`;
                });
            });
            


            document.querySelectorAll(".update-btn").forEach(function (button) {
                button.addEventListener("click", function () {
                    const reviewId = button.getAttribute("data-review-id");
                    console.log(`Update button clicked for review_id: ${reviewId}`);
                    localStorage.setItem("reviewId", reviewId);
                    window.location.href = `/review/update`;
                });
            });

            document.querySelectorAll(".delete-btn").forEach(function (button) {
                button.addEventListener("click", function () {
                    const reviewId = button.getAttribute("data-review-id");
                    console.log(`Delete button clicked for review_id: ${reviewId}`);
                    localStorage.setItem("reviewId", reviewId);
                    window.location.href = `/review/delete`;
                });
            });
        })
        .catch(function (error) {
            console.error("Error fetching reviews:", error);
        });
});
