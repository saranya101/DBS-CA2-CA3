document.addEventListener("DOMContentLoaded", function() {
    const userInfoContainer = document.getElementById("user-info-container");

    fetch("/user/me", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data) {
            const userHtml = `
                <div class="user-info">
                    <h3>${data.username}</h3>
                    <p><strong>Email:</strong> ${data.email}</p>
                    <p><strong>Date of Birth:</strong> ${new Date(data.dob).toLocaleDateString()}</p>
                    <p><strong>Gender:</strong> ${data.gender}</p>
                    <p><strong>Referral Code:</strong> ${data.referral_code}</p>
                    <p><strong>Points Balance:</strong> ${data.pointsBalance?.points || 0}</p>
                    
                    <div class="referrals">
                        <h4>Referrals Made:</h4>
                        ${(data.referralsMade || []).map(referral => `
                            <p>Referred User: ${referral.referred?.username || 'Unknown'}</p>
                        `).join('')}
                    </div>
                    
                    <div class="orders">
                        <h4>Orders:</h4>
                        ${(data.sale_order || []).map(order => `
                            <p>Order ID: ${order.id} | Status: ${order.status} | Date: ${new Date(order.order_datetime).toLocaleDateString()}</p>
                            <ul>
                                ${(order.sale_order_item || []).map(item => `
                                    <li>Product: ${item.product?.name || 'Unknown'} | Quantity: ${item.quantity} | Price: ${item.product?.unit_price || 'N/A'}</li>
                                `).join('')}
                            </ul>
                        `).join('')}
                    </div>

                    <div class="reviews">
                        <h4>Reviews:</h4>
                        ${(data.reviews || []).map(review => `
                            <p>Product ID: ${review.productid} | Rating: ${review.rating} | Review: ${review.reviewtext}</p>
                        `).join('')}
                    </div>

                    <div class="favourites">
                        <h4>Favourite Items:</h4>
                        ${(data.favouritelists || []).map(list => `
                            <p>List: ${list.list_name}</p>
                            <ul>
                                ${(list.favouritelistitems || []).map(item => `
                                    <li>Product: ${item.product?.name || 'Unknown'}</li>
                                `).join('')}
                            </ul>
                        `).join('')}
                    </div>
                    
                    <div class="social-media-engagements">
                        <h4>Social Media Engagements:</h4>
                        ${(data.socialMediaEngagements || []).map(engagement => `
                            <p>Action: ${engagement.action} on ${engagement.platform} | Points: ${engagement.points}</p>
                        `).join('')}
                    </div>
                </div>
            `;

            userInfoContainer.innerHTML = userHtml;
        } else {
            userInfoContainer.innerHTML = "<p>User information not available.</p>";
        }
    })
    .catch(error => {
        console.error("Error fetching user data:", error);
        userInfoContainer.innerHTML = "<p>Error loading user information.</p>";
    });
});
