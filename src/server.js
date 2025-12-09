require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

app.use(
  '/profilePictures',
  express.static(path.join(__dirname, '..', 'profilePictures'))
);

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, 'backend.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

app.use((req, res, next) => {
  const now = new Date().toISOString();
  const msg = `[${now}] ${req.method} ${req.originalUrl} - IP: ${req.ip}\n`;

  process.stdout.write(msg);
  logStream.write(msg);

  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 4000, () => console.log(`🚀 Server running at http://localhost:${process.env.PORT}`)))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
