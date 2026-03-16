// Upload static TwiML XML to Vercel Blob, then configure Twilio to use it
const fs = require('fs');
const path = require('path');
const { put } = require(path.join(__dirname, '..', 'dashboard', 'node_modules', '@vercel', 'blob'));

// Load Blob token from dashboard/.env.local
const envLocal = fs.readFileSync(path.join(__dirname, '..', 'dashboard', '.env.local'), 'utf-8');
const blobToken = envLocal.match(/BLOB_READ_WRITE_TOKEN="?([^"\n]+)"?/)?.[1]?.trim();
if (!blobToken) { console.error('Missing BLOB_READ_WRITE_TOKEN'); process.exit(1); }
process.env.BLOB_READ_WRITE_TOKEN = blobToken;

const FERDIE_CELL = '+15193788973';

const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>${FERDIE_CELL}</Dial>
</Response>`;

async function main() {
  console.log('Uploading TwiML to Vercel Blob...');
  const result = await put('twilio/forward-to-ferdie.xml', twiml, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'text/xml',
  });
  console.log('Uploaded:', result.url);
  return result.url;
}

main().then(url => {
  console.log('\nTwiML Blob URL:', url);
  console.log('Now run the Python script to point Twilio to this URL.');
  // Write the URL to a temp file for the Python script
  fs.writeFileSync('/tmp/twiml_blob_url.txt', url);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
