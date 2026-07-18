const pool = require('../config/db');

// POST /api/files/:id/share  { email, permission }
async function shareFile(req, res) {
  try {
    const { id } = req.params;
    const { email, permission } = req.body;

    if (!email) return res.status(400).json({ error: 'email is required' });
    const perm = permission === 'edit' ? 'edit' : 'view';

    const fileResult = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    const file = fileResult.rows[0];
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can share this file' });
    }
    if (email === req.user.email) {
      return res.status(400).json({ error: 'You already own this file' });
    }

    await pool.query(
      `INSERT INTO shares (file_id, shared_with_email, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (file_id, shared_with_email) DO UPDATE SET permission = $3`,
      [id, email, perm]
    );

    res.status(201).json({ message: `Shared with ${email}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sharing failed' });
  }
}

// GET /api/files/:id/shares  (list who a file is shared with)
async function listShares(req, res) {
  try {
    const { id } = req.params;
    const fileResult = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    const file = fileResult.rows[0];
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can view shares' });
    }

    const shares = await pool.query(
      'SELECT id, shared_with_email, permission, created_at FROM shares WHERE file_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(shares.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not list shares' });
  }
}

// DELETE /api/files/:id/share/:shareId
async function revokeShare(req, res) {
  try {
    const { id, shareId } = req.params;
    const fileResult = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    const file = fileResult.rows[0];
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can revoke access' });
    }

    await pool.query('DELETE FROM shares WHERE id = $1 AND file_id = $2', [shareId, id]);
    res.json({ message: 'Access revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not revoke access' });
  }
}

module.exports = { shareFile, listShares, revokeShare };
