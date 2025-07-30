const express = require('express');
const FileType = require('file-type'); // <-- Import file-type
const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' })); // Increase limit if needed

// POST route to detect MIME type from base64
app.post('/api/check-file-type', async (req, res) => {
    const inputData = req.body.base64;

    if (!inputData) {
        return res.status(400).json({ error: 'Base64 string is required in "base64" field.' });
    }

    try {
        // Detect MIME type
        const mimeInfo = await detectMimeType(inputData);

        if (mimeInfo) {
            res.json({ mime: mimeInfo.mime, extension: mimeInfo.ext });
        } else {
            res.status(415).json({ error: 'Could not detect MIME type' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Utility function
async function detectMimeType(base64String) {
    // Remove data URL prefix if present
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const base64Data = matches ? matches[2] : base64String;

    // Convert to Buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Detect file type
    return await FileType.fromBuffer(buffer);
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
