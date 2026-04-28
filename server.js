const express = require('express');
const axios = require('axios');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Server Pool Configuration
const servers = [
  { id: 1, name: 'Server A', url: 'http://localhost:3001', load: 0, requests: 0, status: 'active', responseTime: 0 },
  { id: 2, name: 'Server B', url: 'http://localhost:3002', load: 0, requests: 0, status: 'active', responseTime: 0 },
  { id: 3, name: 'Server C', url: 'http://localhost:3003', load: 0, requests: 0, status: 'active', responseTime: 0 },
  { id: 4, name: 'Server D', url: 'http://localhost:3004', load: 0, requests: 0, status: 'active', responseTime: 0 }
];

// Statistics
let stats = {
  totalRequests: 0,
  roundRobinCount: 0,
  leastConnCount: 0,
  aiCount: 0,
  avgResponseTime: 0,
  algorithmHistory: [],
  serverMetrics: []
};

let currentAlgorithm = 'round-robin';
let roundRobinIndex = 0;

// AI Service URL
const AI_SERVICE_URL = 'http://localhost:5000/predict';

// Helper: Simulate server processing
async function callServer(server, requestData) {
  const startTime = Date.now();
  try {
    const response = await axios.post(`${server.url}/process`, requestData, { timeout: 3000 });
    const responseTime = Date.now() - startTime;
    server.responseTime = responseTime;
    server.load = Math.min(100, server.load + (Math.random() * 10));
    server.requests++;
    stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;
    return { success: true, data: response.data, responseTime };
  } catch (error) {
    server.status = 'degraded';
    return { success: false, error: error.message, responseTime: Date.now() - startTime };
  }
}

// Round Robin Algorithm
async function roundRobinRoute(requestData) {
  const availableServers = servers.filter(s => s.status === 'active');
  if (availableServers.length === 0) return null;
  
  roundRobinIndex = (roundRobinIndex + 1) % availableServers.length;
  const selectedServer = availableServers[roundRobinIndex];
  const result = await callServer(selectedServer, requestData);
  
  stats.roundRobinCount++;
  stats.algorithmHistory.push({ algorithm: 'round-robin', server: selectedServer.name, time: new Date().toISOString() });
  
  return { server: selectedServer, result };
}

// Least Connections Algorithm
async function leastConnectionsRoute(requestData) {
  const availableServers = servers.filter(s => s.status === 'active');
  if (availableServers.length === 0) return null;
  
  const selectedServer = availableServers.reduce((min, server) => 
    server.requests < min.requests ? server : min, availableServers[0]);
  
  const result = await callServer(selectedServer, requestData);
  
  stats.leastConnCount++;
  stats.algorithmHistory.push({ algorithm: 'least-connections', server: selectedServer.name, time: new Date().toISOString() });
  
  return { server: selectedServer, result };
}

// AI-Based Routing
async function aiRoute(requestData) {
  try {
    // Prepare features for AI prediction
    const features = {
      current_loads: servers.map(s => s.load),
      request_history: stats.algorithmHistory.slice(-10),
      time_of_day: new Date().getHours(),
      request_rate: stats.totalRequests / (Date.now() / 1000 || 1)
    };
    
    const aiResponse = await axios.post(AI_SERVICE_URL, features, { timeout: 1000 });
    const recommendedServerId = aiResponse.data.recommended_server;
    const predictions = aiResponse.data.predictions;
    
    const selectedServer = servers.find(s => s.id === recommendedServerId);
    if (!selectedServer || selectedServer.status !== 'active') {
      return await leastConnectionsRoute(requestData);
    }
    
    const result = await callServer(selectedServer, requestData);
    
    stats.aiCount++;
    stats.algorithmHistory.push({ algorithm: 'ai', server: selectedServer.name, time: new Date().toISOString(), predictions });
    
    return { server: selectedServer, result, predictions };
  } catch (error) {
    console.log('AI service unavailable, falling back to least connections');
    return await leastConnectionsRoute(requestData);
  }
}

// Main routing endpoint
app.post('/route', async (req, res) => {
  stats.totalRequests++;
  
  let routingResult;
  switch (currentAlgorithm) {
    case 'round-robin':
      routingResult = await roundRobinRoute(req.body);
      break;
    case 'least-connections':
      routingResult = await leastConnectionsRoute(req.body);
      break;
    case 'ai':
      routingResult = await aiRoute(req.body);
      break;
    default:
      routingResult = await roundRobinRoute(req.body);
  }
  
  if (!routingResult) {
    return res.status(503).json({ error: 'No servers available' });
  }
  
  // Update server metrics for dashboard
  stats.serverMetrics = servers.map(s => ({
    id: s.id,
    name: s.name,
    load: Math.round(s.load),
    requests: s.requests,
    responseTime: Math.round(s.responseTime),
    status: s.status
  }));
  
  io.emit('metrics', {
    stats: {
      totalRequests: stats.totalRequests,
      roundRobinCount: stats.roundRobinCount,
      leastConnCount: stats.leastConnCount,
      aiCount: stats.aiCount,
      avgResponseTime: Math.round(stats.avgResponseTime)
    },
    servers: stats.serverMetrics,
    currentAlgorithm,
    recentHistory: stats.algorithmHistory.slice(-20)
  });
  
  res.json({
    algorithm: currentAlgorithm,
    server: routingResult.server.name,
    responseTime: routingResult.result.responseTime,
    predictions: routingResult.predictions
  });
});

// Change algorithm endpoint
app.post('/algorithm', (req, res) => {
  const { algorithm } = req.body;
  if (['round-robin', 'least-connections', 'ai'].includes(algorithm)) {
    currentAlgorithm = algorithm;
    res.json({ success: true, algorithm: currentAlgorithm });
  } else {
    res.status(400).json({ error: 'Invalid algorithm' });
  }
});

// Get current metrics
app.get('/metrics', (req, res) => {
  res.json({
    stats: {
      totalRequests: stats.totalRequests,
      roundRobinCount: stats.roundRobinCount,
      leastConnCount: stats.leastConnCount,
      aiCount: stats.aiCount,
      avgResponseTime: Math.round(stats.avgResponseTime)
    },
    servers: servers.map(s => ({
      id: s.id,
      name: s.name,
      load: Math.round(s.load),
      requests: s.requests,
      responseTime: Math.round(s.responseTime),
      status: s.status
    })),
    currentAlgorithm
  });
});

// Reset stats
app.post('/reset', (req, res) => {
  stats = {
    totalRequests: 0,
    roundRobinCount: 0,
    leastConnCount: 0,
    aiCount: 0,
    avgResponseTime: 0,
    algorithmHistory: [],
    serverMetrics: []
  };
  servers.forEach(s => {
    s.load = 0;
    s.requests = 0;
    s.responseTime = 0;
    s.status = 'active';
  });
  roundRobinIndex = 0;
  res.json({ success: true });
});

// Start mock backend servers
function startMockServers() {
  const serverPorts = [3001, 3002, 3003, 3004];
  serverPorts.forEach((port, idx) => {
    const mockApp = express();
    mockApp.use(express.json());
    mockApp.post('/process', (req, res) => {
      const processingTime = Math.random() * 100 + 20; // 20-120ms
      setTimeout(() => {
        res.json({
          server: `Server ${String.fromCharCode(65 + idx)}`,
          processed: true,
          timestamp: new Date().toISOString(),
          data: req.body
        });
      }, processingTime);
    });
    mockApp.listen(port, () => {
      console.log(`Mock server ${String.fromCharCode(65 + idx)} running on port ${port}`);
    });
  });
}
const PORT = 3000;
startMockServers();
server.listen(PORT, () => {
  console.log(`Load Balancer running on http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
});