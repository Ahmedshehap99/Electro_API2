const API = "https://localhost:44351/api";

let uploadedImageUrl = "";

// رفع الصورة
async function uploadImage() {
    const file = document.getElementById("imageInput").files[0];

    if (!file) {
        alert("Choose image first");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API}/Products/upload`, {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    uploadedImageUrl = data.imageUrl;

    console.log("Uploaded:", uploadedImageUrl);
    alert("Image uploaded successfully!");
}

// إضافة المنتج
async function addProduct() {
    const token = localStorage.getItem("token");

    const name = document.getElementById("name").value;
    const price = parseFloat(document.getElementById("price").value);

    const res = await fetch(`${API}/Products`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // 🔥 مهم
        },
        body: JSON.stringify({
            name,
            price,
            imageUrl: uploadedImageUrl
        })
    });

    if (res.ok) {
        alert("Product added!");
    } else {
        alert("Error adding product");
    }
}
