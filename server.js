// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(session({
  secret: 'smartshield-secret-key-2025-technomind',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Store latest sensor data
let latestSensorData = {
  gas: 0,
  temperature: 0,
  humidity: 0,
  alert: false,
  buzzer: false
};

// Store latest pulse data
let latestPulseData = {
  bpm: 0,
  status: "NORMAL"
};

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', username);
  
  // Simple authentication
  if (username === 'ADMIN' && password === 'ADMIN') {
    req.session.authenticated = true;
    req.session.username = username;
    req.session.loginTime = new Date();
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Middleware to check authentication for API endpoints
function requireAuth(req, res, next) {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// HTTP endpoint for ESP8266 Helmet to send data - NO AUTH NEEDED
app.post('/api/sensor-data', (req, res) => {
  console.log('Received sensor data:', req.body);
  latestSensorData = { ...latestSensorData, ...req.body };
  res.json({ status: 'success', message: 'Data received' });
});

// HTTP endpoint for ESP8266 Pulse to send data - NO AUTH NEEDED
app.post('/api/pulse-data', (req, res) => {
  console.log('Received pulse data:', req.body);
  latestPulseData = { ...latestPulseData, ...req.body };
  res.json({ status: 'success', message: 'Pulse data received' });
});

// HTTP endpoint for webpage to get sensor data - AUTH REQUIRED
app.get('/api/sensor-data', requireAuth, (req, res) => {
  res.json(latestSensorData);
});

// HTTP endpoint for webpage to get pulse data - AUTH REQUIRED
app.get('/api/pulse-data', requireAuth, (req, res) => {
  res.json(latestPulseData);
});

// HTTP endpoint to get all data combined - AUTH REQUIRED
app.get('/api/all-data', requireAuth, (req, res) => {
  res.json({
    sensor: latestSensorData,
    pulse: latestPulseData
  });
});

// Serve the main page
app.get('/', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the login page
app.get('/login.html', (req, res) => {
  if (req.session.authenticated) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check auth status endpoint
app.get('/api/check-auth', (req, res) => {
  res.json({ 
    authenticated: !!req.session.authenticated,
    username: req.session.username || null,
    loginTime: req.session.loginTime || null
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    serverTime: new Date().toISOString(),
    sensorData: Object.keys(latestSensorData).length > 0,
    pulseData: Object.keys(latestPulseData).length > 0
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Waiting for ESP8266 HTTP requests...');
});

// HTTP endpoint for devices to get pulse data (NO AUTH REQUIRED)
app.get('/api/device-pulse-data', (req, res) => {
  res.json({
    bpm: latestPulseData.bpm,
    status: latestPulseData.status
  });
});