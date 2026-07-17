const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3400;

// Serve the site from the repo root (index.html, sites/, favicons, etc.)
app.use(express.static(__dirname));

// Fall back to the 404 page for anything else
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
