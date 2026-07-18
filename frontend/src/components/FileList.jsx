import React from 'react';
import { downloadFileBlob } from '../api/api.js';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function iconFor(mime) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎞️';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📕';
  return '📄';
}

export default function FileList({ files, canManage, onDelete, onShare, onVersions }) {
  if (files.length === 0) {
    return <p className="muted empty-state">No files here yet.</p>;
  }

  return (
    <table className="file-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Size</th>
          <th>Version</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {files.map((f) => (
          <tr key={f.id}>
            <td className="file-name-cell">
              <span className="file-icon">{iconFor(f.mime_type)}</span>
              {f.original_name}
              {!canManage && <span className="pill">{f.access}</span>}
            </td>
            <td>{formatBytes(f.size)}</td>
            <td>v{f.current_version}</td>
            <td>{new Date(f.updated_at).toLocaleDateString()}</td>
            <td className="row-actions">
              <button className="btn-link" onClick={() => downloadFileBlob(f.id, f.original_name)}>
                Download
              </button>
              <button className="btn-link" onClick={() => onVersions(f)}>
                Versions
              </button>
              {canManage && (
                <>
                  <button className="btn-link" onClick={() => onShare(f)}>
                    Share
                  </button>
                  <button className="btn-link danger" onClick={() => onDelete(f)}>
                    Delete
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
