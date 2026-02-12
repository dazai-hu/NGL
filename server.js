
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');
console.log(`Starting server... serving static files from: ${distPath}`);

app.use(express.static(distPath));

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`Error sending index.html: ${err.message}`);
      res.status(500).send("Server Error: build output missing.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`NGL Wave Engine: Production mode active on port ${PORT}`);
});
