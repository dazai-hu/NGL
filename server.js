
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Set correct MIME types for ESM and Workers
express.static.mime.define({'application/javascript': ['js', 'tsx', 'ts']});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Send index.html for all routes to handle potential client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`NGL Wave Engine running on port ${PORT}`);
});
