// Storage abstraction layer.
// STORAGE_DRIVER=local  -> saves files to disk under backend/uploads (default, zero setup)
// STORAGE_DRIVER=s3     -> saves files to a real AWS S3 bucket
//
// This lets the same codebase demonstrate cloud storage integration (S3)
// while remaining runnable locally with no AWS account.

const fs = require('fs');
const path = require('path');

const driver = process.env.STORAGE_DRIVER || 'local';
const LOCAL_DIR = path.join(__dirname, '..', '..', 'uploads');

if (driver === 'local' && !fs.existsSync(LOCAL_DIR)) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

let s3Client;
if (driver === 's3') {
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({ region: process.env.AWS_REGION });
}

/**
 * Save a buffer to storage under a unique key.
 * Returns the storage key (used later to fetch/delete the file).
 */
async function saveFile(key, buffer) {
  if (driver === 'local') {
    const filePath = path.join(LOCAL_DIR, key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    return key;
  }

  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
    })
  );
  return key;
}

/**
 * Retrieve a file's contents as a Buffer.
 */
async function getFile(key) {
  if (driver === 'local') {
    const filePath = path.join(LOCAL_DIR, key);
    return fs.readFileSync(filePath);
  }

  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key })
  );
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * Delete a file from storage.
 */
async function deleteFile(key) {
  if (driver === 'local') {
    const filePath = path.join(LOCAL_DIR, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }

  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key })
  );
}

module.exports = { saveFile, getFile, deleteFile, driver };
