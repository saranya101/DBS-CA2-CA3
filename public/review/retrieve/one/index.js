window.addEventListener('DOMContentLoaded', function () {
    // Get the review ID from the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const reviewId = urlParams.get('id'); // Use 'id' to match your URL structure

    if (!reviewId) {
        console.error('Review ID not found in URL');
        return;
    }

    console.log('Full URL:', window.location.href);
    console.log('URL Search Params:', window.location.search);
    console.log('Retrieved reviewId:', reviewId);

    // Function to fetch a single review
    function fetchReview(reviewId) {
        const token = localStorage.getItem('token');

        if (!token) {
            console.error('Token not found in localStorage');
            return Promise.reject('Token not found in localStorage');
        }

        return fetch(`/reviews/specific/${reviewId}`, { // Adjust URL as per your endpoint
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json(); // Convert the response to JSON
        })
        .catch(error => {
            console.error('Error in fetch request:', error);
            throw error; // Rethrow the error to be handled by the caller
        });
    }

    // Fetch and display the review
    fetchReview(reviewId)
        .then(data => {
            // Log the data to verify its structure
            console.log('Fetched review data:', data);

            // Check if the response has the correct structure
            if (!data || !data.reviews || !data.reviews.length) {
                throw new Error('Invalid response structure');
            }

            const review = data.reviews[0]; // Assuming the first review is the one we're interested in
            const reviewContainer = document.querySelector("#review-container");

            if (!reviewContainer) {
                console.error('Review container not found');
                return;
            }

            reviewContainer.innerHTML = `
            <h2>Review ID: ${review.reviewid}</h2>
            <p><strong>Product Name:</strong> ${review.productname}</p>
            <p><strong>Member ID:</strong> ${review.memberid}</p>
            <p><strong>Product ID:</strong> ${review.productid}</p>
            <p><strong>Rating:</strong> ${'⭐'.repeat(review.rating)}</p>
            <p><strong>Review Text:</strong> ${review.reviewtext}</p>
            <p><strong>Created At:</strong> ${new Date(review.createdat).toLocaleDateString()} ${new Date(review.createdat).toLocaleTimeString()}</p>
            <p><strong>Updated At:</strong> ${new Date(review.updatedat).toLocaleDateString()} ${new Date(review.updatedat).toLocaleTimeString()}</p>
        `;
        
        })
        .catch(error => {
            console.error("Error fetching review:", error);
        });
});

