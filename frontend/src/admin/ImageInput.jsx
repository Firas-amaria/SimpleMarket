import React, { useRef, useState } from "react";
import uploadToCloudinary from "./uploadToCloudinary";

export default function ImageInput({ value, onChange }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFiles = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch (e) {
      alert(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: "2px dashed #bbb",
          borderColor: dragOver ? "#333" : "#bbb",
          borderRadius: 8,
          padding: 16,
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        {uploading ? (
          <div>Uploading…</div>
        ) : value ? (
          <img src={value} alt="preview" style={{ maxWidth: "100%", maxHeight: 160 }} />
        ) : (
          <div>Drop image here or click to select</div>
        )}
      </div>

      <input
        type="file"
        ref={fileRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files?.[0])}
      />

      {value && (
        <div style={{ marginTop: 6 }}>
          <small>URL:</small>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            style={{ width: "100%" }}
          />
        </div>
      )}
    </div>
  );
}
