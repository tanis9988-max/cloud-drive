const API_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('clouddrive_token');
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  if (!res.ok) throw new Error('Request failed');
  return res.blob();
}

export const api = {
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: { name, email, password } }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  listFiles: (search = '') =>
    request(`/files${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  uploadFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/files', { method: 'POST', body: form, isForm: true });
  },
  uploadVersion: (fileId, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/files/${fileId}/versions`, { method: 'POST', body: form, isForm: true });
  },
  deleteFile: (fileId) => request(`/files/${fileId}`, { method: 'DELETE' }),
  listVersions: (fileId) => request(`/files/${fileId}/versions`),

  shareFile: (fileId, email, permission) =>
    request(`/files/${fileId}/share`, { method: 'POST', body: { email, permission } }),
  listShares: (fileId) => request(`/files/${fileId}/shares`),
  revokeShare: (fileId, shareId) =>
    request(`/files/${fileId}/share/${shareId}`, { method: 'DELETE' }),

  analytics: () => request('/analytics'),

  downloadUrl: (fileId) => {
    const token = getToken();
    return `${API_URL}/files/${fileId}/download?token=${token}`;
  },
};

// Downloads need auth headers, so fetch as a blob and trigger a save manually.
export async function downloadFileBlob(fileId, filename) {
  const token = getToken();
  const res = await fetch(`${API_URL}/files/${fileId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadVersionBlob(fileId, versionId, filename) {
  const token = getToken();
  const res = await fetch(`${API_URL}/files/${fileId}/versions/${versionId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export { getToken };
