import React, { useEffect, useState, useRef } from 'react';
import { api, downloadVersionBlob } from '../api/api.js';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function VersionHistory({ file, onClose, onNewVersion }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef();

  async function load() {
    setLoading(true);
    const data = await api.listVersions(file.id);
    setVersions(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  async function handleNewVersion(e) {
    const newFile = e.target.files[0];
    if (!newFile) return;
    await api.uploadVersion(file.id, newFile);
    e.target.value = '';
    await load();
    onNewVersion();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Version history — {file.original_name}</h2>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <ul className="version-list">
            {versions.map((v) => (
              <li key={v.id}>
                <div>
                  <strong>v{v.version_number}</strong>
                  <span className="muted"> · {formatBytes(v.size)}</span>
                  <span className="muted"> · {new Date(v.uploaded_at).toLocaleString()}</span>
                </div>
                <button
                  className="btn-link"
                  onClick={() =>
                    downloadVersionBlob(file.id, v.id, `v${v.version_number}-${file.original_name}`)
                  }
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}

        <button className="btn-secondary" onClick={() => inputRef.current.click()}>
          Upload new version
        </button>
        <input ref={inputRef} type="file" hidden onChange={handleNewVersion} />

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
