const multer = require('multer');

// Files are received into memory, then handed to the storage layer
// (local disk or S3). 25MB cap keeps the demo simple and cheap to run.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

module.exports = upload;
