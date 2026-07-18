import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/api.js';
import SearchBar from '../components/SearchBar.jsx';
import UploadButton from '../components/UploadButton.jsx';
import FileList from '../components/FileList.jsx';
import ShareModal from '../components/ShareModal.jsx';
import VersionHistory from '../components/VersionHistory.jsx';
import StorageAnalytics from '../components/StorageAnalytics.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState({ owned: [], shared: [] });
  const [tab, setTab] = useState('owned');
  const [shareTarget, setShareTarget] = useState(null);
  const [versionTarget, setVersionTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.listFiles(search);
    setFiles(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  async function handleDelete(file) {
    if (!window.confirm(`Delete "${file.original_name}"? This cannot be undone.`)) return;
    await api.deleteFile(file.id);
    refresh();
  }

  const activeList = tab === 'owned' ? files.owned : files.shared;

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          CloudDrive
        </div>
        <div className="topbar-right">
          <span className="muted">{user?.name}</span>
          <button className="btn-secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="analytics-section">
          <StorageAnalytics refreshKey={refreshKey} />
        </section>

        <section className="files-section">
          <div className="files-toolbar">
            <SearchBar value={search} onChange={setSearch} />
            <UploadButton onUploaded={refresh} />
          </div>

          <div className="tabs">
            <button
              className={tab === 'owned' ? 'tab active' : 'tab'}
              onClick={() => setTab('owned')}
            >
              My files ({files.owned.length})
            </button>
            <button
              className={tab === 'shared' ? 'tab active' : 'tab'}
              onClick={() => setTab('shared')}
            >
              Shared with me ({files.shared.length})
            </button>
          </div>

          {loading ? (
            <p className="muted">Loading…</p>
          ) : (
            <FileList
              files={activeList}
              canManage={tab === 'owned'}
              onDelete={handleDelete}
              onShare={setShareTarget}
              onVersions={setVersionTarget}
            />
          )}
        </section>
      </main>

      {shareTarget && <ShareModal file={shareTarget} onClose={() => setShareTarget(null)} />}
      {versionTarget && (
        <VersionHistory
          file={versionTarget}
          onClose={() => setVersionTarget(null)}
          onNewVersion={refresh}
        />
      )}
    </div>
  );
}
