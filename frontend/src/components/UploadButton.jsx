import React, { useRef, useState } from 'react';
import { api } from '../api/api.js';

export default function UploadButton({ onUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      await api.uploadFile(file);
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="upload-wrap">
      <button className="btn-primary" onClick={() => inputRef.current.click()} disabled={uploading}>
        {uploading ? 'Uploading…' : '+ Upload file'}
      </button>
      <input ref={inputRef} type="file" hidden onChange={handleChange} />
      {error && <span className="inline-error">{error}</span>}
    </div>
  );
}
