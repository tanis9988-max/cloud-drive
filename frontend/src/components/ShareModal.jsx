import React, { useEffect, useState } from 'react';
import { api } from '../api/api.js';

export default function ShareModal({ file, onClose }) {
  const [shares, setShares] = useState([]);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await api.listShares(file.id);
    setShares(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  async function handleShare(e) {
    e.preventDefault();
    setError('');
    try {
      await api.shareFile(file.id, email, permission);
      setEmail('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRevoke(shareId) {
    await api.revokeShare(file.id, shareId);
    await load();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share — {file.original_name}</h2>

        <form className="share-form" onSubmit={handleShare}>
          <input
            type="email"
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select value={permission} onChange={(e) => setPermission(e.target.value)}>
            <option value="view">Can view</option>
            <option value="edit">Can edit</option>
          </select>
          <button type="submit" className="btn-primary">
            Share
          </button>
        </form>
        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <p>Loading…</p>
        ) : shares.length === 0 ? (
          <p className="muted">Not shared with anyone yet.</p>
        ) : (
          <ul className="share-list">
            {shares.map((s) => (
              <li key={s.id}>
                <span>{s.shared_with_email}</span>
                <span className="muted">{s.permission}</span>
                <button className="btn-link" onClick={() => handleRevoke(s.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
