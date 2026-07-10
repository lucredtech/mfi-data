const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME;

/**
 * Upload a file buffer to S3.
 * Returns the S3 key. Throws on failure.
 */
async function uploadStatement(buffer, { clientId, resultId, filename, mimetype }) {
  if (!BUCKET) throw new Error('AWS_S3_BUCKET env var not set');
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `mfi-statements/${clientId}/${month}/${resultId}_${safe}`;

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    // Private by default — no ACL needed if bucket blocks public access
  }));

  return key;
}

/**
 * Generate a pre-signed GET URL for a statement (expires in 1 hour by default).
 */
async function getStatementUrl(key, expiresInSeconds = 3600) {
  if (!BUCKET) throw new Error('AWS_S3_BUCKET env var not set');
  return getSignedUrl(client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: expiresInSeconds });
}

/**
 * Upload a generic document to S3 (onboarding CAC docs, ID cards, financials, etc.)
 * Returns the S3 key. Throws on failure.
 */
async function uploadDocument(buffer, { clientId, sessionToken, filename, mimetype, folder = 'onboarding' }) {
  if (!BUCKET) throw new Error('AWS_S3_BUCKET env var not set');
  const safe = (filename || 'doc').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${folder}/${clientId}/${sessionToken}/${Date.now()}_${safe}`;

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype || 'application/octet-stream',
  }));

  return key;
}

module.exports = { uploadStatement, getStatementUrl, uploadDocument };
