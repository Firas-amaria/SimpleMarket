// src/admin/uploadToCloudinary.js
export default async function uploadToCloudinary(file) {
  const cloud = process.env.REACT_APP_CLOUDINARY_CLOUD;
  const preset = process.env.REACT_APP_CLOUDINARY_PRESET;

  if (!file) throw new Error("No file selected");
  if (!cloud || !preset) throw new Error("Cloudinary env variables missing");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed: ${errText}`);
  }

  const data = await res.json();
  return data.secure_url; // This URL will go into your form.image
}
