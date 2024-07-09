window.addEventListener('DOMContentLoaded', function () {

    const token = localStorage.getItem('token');
    const reviewId = localStorage.getItem('reviewId');

    const form = document.querySelector('form');

    if (!form) {
        console.error('Form element not found.');
        return;
    }

    const reviewIdInput = form.querySelector('input[name=reviewId]');
    const ratingInput = form.querySelector('select[name=rating]');
    const reviewTextInput = form.querySelector('textarea[name=reviewText]');

    if (!reviewIdInput || !ratingInput || !reviewTextInput) {
        console.error('Review ID, Rating, or ReviewText input element not found.');
        return;
    }

    reviewIdInput.value = reviewId;

    form.onsubmit = function (e) {
        e.preventDefault(); // prevent using the default submit behavior

        const rating = ratingInput.value;
        const reviewText = reviewTextInput.value;

        if (!rating || !reviewText) {
            alert("Rating and Review Text cannot be empty.");
            return;
        }

        console.log('Submitting review update with data:', {
            reviewId: reviewId,
            rating: rating,
            reviewText: reviewText
        });

        // update review details by reviewId using fetch API with method PUT
        fetch(`/reviews/${reviewId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                rating: rating,
                reviewText: reviewText
            }),
        })
        .then(function (response) {
            if (response.ok) {
                alert('Review updated!');
                // Clear the input field
                ratingInput.value = "";
                reviewTextInput.value = "";
            } else {
                // If fail, show the error message
                response.json().then(function (data) {
                    alert(`Error updating review - ${data.error}`);
                });
            }
        })
        .catch(function (error) {
            alert('Error updating review');
        });
    };
});
