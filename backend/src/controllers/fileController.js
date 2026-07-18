const crypto = require('crypto');
const pool = require('../config/db');
const storage = require('../utils/storage');

function makeKey(userId, originalName) {
  const unique = crypto.randomBytes(8).toString('hex');
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userId}/${Date.now()}-${unique}-${safeName}`;
}

// POST /api/files  (upload a brand new file)
async function uploadFile(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { originalname, mimetype, size, buffer } = req.file;
    const key = makeKey(req.user.id, originalname);
    await storage.saveFile(key, buffer);

    const result = await pool.query(
      `INSERT INTO files (owner_id, original_name, mime_type, size, current_version, storage_key)
       VALUES ($1, $2, $3, $4, 1, $5) RETURNING *`,
      [req.user.id, originalname, mimetype, size, key]
    );
    const file = result.rows[0];

    await pool.query(
      `INSERT INTO file_versions (file_id, version_number, storage_key, size)
       VALUES ($1, 1, $2, $3)`,
      [file.id, key, size]
    );

    res.status(201).json(file);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
}

// POST /api/files/:id/versions  (upload a new version of an existing file)
async function uploadNewVersion(req, res) {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const fileResult = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    const file = fileResult.rows[0];
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can upload new versions' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const key = makeKey(req.user.id, originalname);
    await storage.saveFile(key, buffer);

    const nextVersion = file.current_version + 1;
    await pool.query(
      `INSERT INTO file_versions (file_id, version_number, storage_key, size)
       VALUES ($1, $2, $3, $4)`,
      [file.id, nextVersion, key, size]
    );

    const updated = await pool.query(
      `UPDATE files SET current_version = $1, storage_key = $2, size = $3,
       mime_type = $4, updated_at = NOW() WHERE id = $5 RETURNING *`,
      [nextVersion, key, size, mimetype, file.id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Version upload failed' });
  }
}

// GET /api/files?search=term  (list files owned by or shared with the user)
async function listFiles(req, res) {
  try {
    const search = req.query.search ? `%${req.query.search}%` : '%';

    const owned = await pool.query(
      `SELECT f.*, 'owner' AS access, NULL AS shared_by
       FROM files f
       WHERE f.owner_id = $1 AND f.original_name ILIKE $2
       ORDER BY f.updated_at DESC`,
      [req.user.id, search]
    );

    const shared = await pool.query(
      `SELECT f.*, s.permission AS access, u.email AS shared_by
       FROM files f
       JOIN shares s ON s.file_id = f.id
       JOIN users u ON u.id = f.owner_id
       WHERE s.shared_with_email = $1 AND f.original_name ILIKE $2
       ORDER BY f.updated_at DESC`,
      [req.user.email, search]
    );

    res.json({ owned: owned.rows, shared: shared.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not list files' });
  }
}

async function getAccessibleFile(fileId, user) {
  const result = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
  const file = result.rows[0];
  if (!file) return { file: null, allowed: false, permission: null };

  if (file.owner_id === user.id) {
    return { file, allowed: true, permission: 'owner' };
  }

  const share = await pool.query(
    'SELECT * FROM shares WHERE file_id = $1 AND shared_with_email = $2',
    [fileId, user.email]
  );
  if (share.rows.length > 0) {
    return { file, allowed: true, permission: share.rows[0].permission };
  }

  return { file, allowed: false, permission: null };
}

// GET /api/files/:id/download
async function downloadFile(req, res) {
  try {
    const { id } = req.params;
    const { file, allowed } = await getAccessibleFile(id, req.user);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (!allowed) return res.status(403).json({ error: 'Access denied' });

    const buffer = await storage.getFile(file.storage_key);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Download failed' });
  }
}

// GET /api/files/:id/versions
async function listVersions(req, res) {
  try {
    const { id } = req.params;
    const { file, allowed } = await getAccessibleFile(id, req.user);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (!allowed) return res.status(403).json({ error: 'Access denied' });

    const versions = await pool.query(
      'SELECT id, version_number, size, uploaded_at FROM file_versions WHERE file_id = $1 ORDER BY version_number DESC',
      [id]
    );
    res.json(versions.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not list versions' });
  }
}

// GET /api/files/:id/versions/:versionId/download
async function downloadVersion(req, res) {
  try {
    const { id, versionId } = req.params;
    const { file, allowed } = await getAccessibleFile(id, req.user);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (!allowed) return res.status(403).json({ error: 'Access denied' });

    const versionResult = await pool.query(
      'SELECT * FROM file_versions WHERE id = $1 AND file_id = $2',
      [versionId, id]
    );
    const version = versionResult.rows[0];
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const buffer = await storage.getFile(version.storage_key);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="v${version.version_number}-${file.original_name}"`
    );
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Download failed' });
  }
}

// DELETE /api/files/:id
async function deleteFile(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    const file = result.rows[0];
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can delete this file' });
    }

    const versions = await pool.query('SELECT storage_key FROM file_versions WHERE file_id = $1', [id]);
    for (const v of versions.rows) {
      await storage.deleteFile(v.storage_key);
    }

    await pool.query('DELETE FROM files WHERE id = $1', [id]);
    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
}

// GET /api/analytics  (storage analytics dashboard data)
async function analytics(req, res) {
  try {
    const totals = await pool.query(
      'SELECT COUNT(*)::int AS file_count, COALESCE(SUM(size), 0)::bigint AS total_size FROM files WHERE owner_id = $1',
      [req.user.id]
    );

    const byType = await pool.query(
      `SELECT
         CASE
           WHEN mime_type LIKE 'image/%' THEN 'Images'
           WHEN mime_type LIKE 'video/%' THEN 'Videos'
           WHEN mime_type LIKE 'audio/%' THEN 'Audio'
           WHEN mime_type = 'application/pdf' THEN 'PDFs'
           WHEN mime_type LIKE 'text/%' THEN 'Text'
           ELSE 'Other'
         END AS category,
         COUNT(*)::int AS file_count,
         COALESCE(SUM(size), 0)::bigint AS total_size
       FROM files
       WHERE owner_id = $1
       GROUP BY category
       ORDER BY total_size DESC`,
      [req.user.id]
    );

    res.json({
      fileCount: totals.rows[0].file_count,
      totalSize: Number(totals.rows[0].total_size),
      byType: byType.rows.map((r) => ({ ...r, total_size: Number(r.total_size) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not compute analytics' });
  }
}

module.exports = {
  uploadFile,
  uploadNewVersion,
  listFiles,
  downloadFile,
  listVersions,
  downloadVersion,
  deleteFile,
  analytics,
  getAccessibleFile,
};
