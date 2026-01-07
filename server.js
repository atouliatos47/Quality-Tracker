const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Create uploads folder if missing
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

let stationData = {};

/**
 * UPLOAD ENDPOINT
 * Handles .xlsx, .csv, and images (.jpg, .png, etc.)
 */
app.post('/upload/:stationId', upload.array('files'), (req, res) => {
    const { stationId } = req.params;
    const files = req.files;

    console.log(`\n>>> Received Upload for: [${stationId}]`);

    // Find the data file (Excel or CSV)
    const dataFile = files.find(f =>
        f.originalname.toLowerCase().endsWith('.xlsx') ||
        f.originalname.toLowerCase().endsWith('.csv')
    );

    // Find image files
    const images = files.filter(f =>
        f.mimetype.startsWith('image/')
    ).map(f => f.filename);

    let rows = [];
    if (dataFile) {
        try {
            const workbook = XLSX.readFile(dataFile.path);
            const sheetName = workbook.SheetNames[0];
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            console.log(`   Table Data: ${rows.length} rows parsed.`);
        } catch (err) {
            console.error("   Error parsing spreadsheet:", err.message);
        }
    }

    // Store in station-specific "bin"
    stationData[stationId] = {
        rows: rows,
        images: images,
        timestamp: new Date().toLocaleTimeString()
    };

    res.json({ success: true });
});

app.get('/get-data/:stationId', (req, res) => {
    res.json(stationData[req.params.stationId] || { rows: [], images: [], timestamp: 'Empty' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`SERVER LIVE AT: http://192.168.170.35:3000`);
    console.log(`========================================`);
});