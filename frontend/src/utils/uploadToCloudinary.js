// src/utils/uploadToCloudinary.js
/**
 * Upload a file to Cloudinary.
 *
 * @param {File|Blob} file - The file to upload.
 * @param {Object} [options]
 * @param {string} [options.folder] - Optional folder name in Cloudinary.
 * @param {string} [options.cloud] - Override Cloudinary cloud name (falls back to env).
 * @param {string} [options.preset] - Override Cloudinary unsigned upload preset (falls back to env).
 * @returns {Promise<{ secure_url: string, public_id: string, original_filename: string }>}
 */

export default async function uploadToCloudinary(file, options = {}) {
  const cloud = options.cloud || process.env.REACT_APP_CLOUDINARY_CLOUD;
  const preset = options.preset || process.env.REACT_APP_CLOUDINARY_PRESET;

  if (!file) throw new Error("No file selected");
  if (!cloud || !preset) throw new Error("Cloudinary env variables missing");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);
  if (options.folder) {
    formData.append("folder", options.folder); // optional: helps organize uploads
  }

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

  return {
    secure_url: data.secure_url, // actual URL to display/use
    public_id: data.public_id, // needed if you ever want to delete or overwrite
    original_filename: data.original_filename, // might be useful for display
  };
}
