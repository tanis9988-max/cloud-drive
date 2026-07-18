const express = require('express');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const fileController = require('../controllers/fileController');
const shareController = require('../controllers/shareController');

const router = express.Router();

router.use(authenticate);

router.get('/', fileController.listFiles);
router.post('/', upload.single('file'), fileController.uploadFile);

router.get('/:id/download', fileController.downloadFile);
router.delete('/:id', fileController.deleteFile);

router.post('/:id/versions', upload.single('file'), fileController.uploadNewVersion);
router.get('/:id/versions', fileController.listVersions);
router.get('/:id/versions/:versionId/download', fileController.downloadVersion);

router.post('/:id/share', shareController.shareFile);
router.get('/:id/shares', shareController.listShares);
router.delete('/:id/share/:shareId', shareController.revokeShare);

module.exports = router;
