import React, { useEffect, useState } from 'react';
import { api } from '../api/api.js';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const COLORS = ['#5B6CFF', '#22C1A0', '#F2A93B', '#EF6461', '#9C6ADE', '#6B7280'];

export default function StorageAnalytics({ refreshKey }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.analytics().then(setData);
  }, [refreshKey]);

  if (!data) return null;

  const max = Math.max(1, ...data.byType.map((t) => t.total_size));

  return (
    <div className="analytics-card">
      <div className="analytics-summary">
        <div>
          <div className="stat-value">{data.fileCount}</div>
          <div className="stat-label">Files stored</div>
        </div>
        <div>
          <div className="stat-value">{formatBytes(data.totalSize)}</div>
          <div className="stat-label">Total storage used</div>
        </div>
      </div>

      {data.byType.length > 0 && (
        <div className="analytics-bars">
          {data.byType.map((t, i) => (
            <div className="bar-row" key={t.category}>
              <span className="bar-label">{t.category}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(t.total_size / max) * 100}%`,
                    background: COLORS[i % COLORS.length],
                  }}
                />
              </div>
              <span className="bar-value">{formatBytes(t.total_size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
