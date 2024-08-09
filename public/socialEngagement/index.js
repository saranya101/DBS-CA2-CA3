document.getElementById("engagementForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent form submission

    const action = document.getElementById("action").value;
    const platform = document.getElementById("platform").value;

    if (!action || !platform) {
        alert("Please fill in all the fields.");
        return;
    }

    fetch("http://localhost:3000/engagement/submit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            action: action,
            platform: platform
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(`Error: ${data.error}`);
        } else {
            alert("Engagement submitted and approved successfully!");
        }
    })
    .catch(error => {
        alert(`Error: ${error.message}`);
    });
});