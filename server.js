
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// The 'dist' directory is created during the 'npm run build' step
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

// Handle Single Page Application routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`NGL Wave Engine: Production mode active on port ${PORT}`);
});
