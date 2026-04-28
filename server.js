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
  { id: 1, name: 'Server A', url: 'http://localhost:3001', load: 0, requests: 0, status: 'active', responseTime: 0, degradedAt: null },
  { id: 2, name: 'Server B', url: 'http://localhost:3002', load: 0, requests: 0, status: 'active', responseTime: 0, degradedAt: null },
  { id: 3, name: 'Server C', url: 'http://localhost:3003', load: 0, requests: 0, status: 'active', responseTime: 0, degradedAt: null },
  { id: 4, name: 'Server D', url: 'http://localhost:3004', load: 0, requests: 0, status: 'active', responseTime: 0, degradedAt: null }
];

// Per-algorithm response time accumulators
let algoStats = {
  'round-robin':      { totalTime: 0, count: 0 },
  'least-connections':{ totalTime: 0, count: 0 },
  'ai':               { totalTime: 0, count: 0 }
};

// Global Statistics
let stats = {
  totalRequests: 0,
  roundRobinCount: 0,
  leastConnCount: 0,
  aiCount: 0,
  avgResponseTime: 0,
  responseTimeCount: 0,
  algorithmHistory: [],
  serverMetrics: [],
  lastAiConfidence: null,
  lastAiReasoning: null
};

// Default algorithm must match the UI default (AI-Powered button is active by default)
let currentAlgorithm = 'ai';
let roundRobinIndex = 0;

// AI Service URL
const AI_SERVICE_URL = 'http://localhost:5000/predict';

let currentRequestRate = 0;
let requestCountSinceLastTick = 0;

// ─── Load Decay & Server Recovery ─────────────────────────────────────────────
// Every 3 seconds: decay load by 5% and recover degraded servers after 10s
setInterval(() => {
  currentRequestRate = requestCountSinceLastTick / 3;
  requestCountSinceLastTick = 0;
  
  const now = Date.now();
  servers.forEach(s => {
    // Decay load
    s.load = Math.max(0, s.load - 5);
    // Auto-recover degraded servers after 10 seconds
    if (s.status === 'degraded' && s.degradedAt && (now - s.degradedAt) > 10000) {
      s.status = 'active';
      s.degradedAt = null;
    }
  });
  // Push periodic metrics even without a request (keeps progress bars live)
  broadcastMetrics();
}, 3000);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function broadcastMetrics() {
  io.emit('metrics', buildMetricsPayload());
}

function buildMetricsPayload() {
  const perAlgo = {};
  for (const [algo, data] of Object.entries(algoStats)) {
    perAlgo[algo] = data.count > 0 ? Math.round(data.totalTime / data.count) : 0;
  }
  return {
    stats: {
      totalRequests: stats.totalRequests,
      roundRobinCount: stats.roundRobinCount,
      leastConnCount: stats.leastConnCount,
      aiCount: stats.aiCount,
      avgResponseTime: Math.round(stats.avgResponseTime),
      perAlgoAvgResponse: perAlgo,
      lastAiConfidence: stats.lastAiConfidence,
      lastAiReasoning: stats.lastAiReasoning
    },
    servers: servers.map(s => ({
      id: s.id,
      name: s.name,
      load: Math.round(s.load),
      requests: s.requests,
      responseTime: Math.round(s.responseTime),
      status: s.status
    })),
    currentAlgorithm,
    recentHistory: stats.algorithmHistory.slice(-20)
  };
}

// Correct running average without distortion
function updateRunningAvg(currentAvg, currentCount, newValue) {
  return currentAvg + (newValue - currentAvg) / (currentCount + 1);
}

// ─── Server Calling ───────────────────────────────────────────────────────────
async function callServer(srv, requestData) {
  const startTime = Date.now();
  try {
    const response = await axios.post(`${srv.url}/process`, requestData, { timeout: 3000 });
    const responseTime = Date.now() - startTime;
    srv.responseTime = updateRunningAvg(srv.responseTime || 0, srv.requests, responseTime);
    // Add load based on processing (capped at 100)
    srv.load = Math.min(100, srv.load + (Math.random() * 20 + 10));
    srv.requests++;
    // Update global running average
    stats.avgResponseTime = updateRunningAvg(stats.avgResponseTime, stats.responseTimeCount, responseTime);
    stats.responseTimeCount++;
    return { success: true, data: response.data, responseTime };
  } catch (error) {
    srv.status = 'degraded';
    srv.degradedAt = Date.now();
    return { success: false, error: error.message, responseTime: Date.now() - startTime };
  }
}

// ─── Routing Algorithms ───────────────────────────────────────────────────────
async function roundRobinRoute(requestData) {
  const available = servers.filter(s => s.status === 'active');
  if (available.length === 0) return null;
  if (roundRobinIndex >= available.length) roundRobinIndex = 0;
  const selected = available[roundRobinIndex];
  roundRobinIndex = (roundRobinIndex + 1) % available.length;
  const result = await callServer(selected, requestData);
  stats.roundRobinCount++;
  // Track per-algo response time
  algoStats['round-robin'].totalTime += result.responseTime;
  algoStats['round-robin'].count++;
  stats.algorithmHistory.push({
    algorithm: 'round-robin',
    server: selected.name,
    responseTime: result.responseTime,
    time: new Date().toISOString()
  });
  return { server: selected, result };
}

async function leastConnectionsRoute(requestData) {
  const available = servers.filter(s => s.status === 'active');
  if (available.length === 0) return null;
  const selected = available.reduce((min, s) => s.requests < min.requests ? s : min, available[0]);
  const result = await callServer(selected, requestData);
  stats.leastConnCount++;
  algoStats['least-connections'].totalTime += result.responseTime;
  algoStats['least-connections'].count++;
  stats.algorithmHistory.push({
    algorithm: 'least-connections',
    server: selected.name,
    responseTime: result.responseTime,
    time: new Date().toISOString()
  });
  return { server: selected, result };
}

async function aiRoute(requestData) {
  try {
    const features = {
      current_loads: servers.map(s => s.load),
      request_history: stats.algorithmHistory.slice(-10),
      time_of_day: new Date().getHours(),
      request_rate: currentRequestRate,
      active_servers: servers.filter(s => s.status === 'active').map(s => s.id)
    };
    const aiResponse = await axios.post(AI_SERVICE_URL, features, { timeout: 1000 });
    const recommendedServerId = aiResponse.data.recommended_server;
    const predictions = aiResponse.data.predictions;
    const confidence = aiResponse.data.confidence;
    const reasoning = aiResponse.data.reasoning;

    // Store AI metadata for UI display
    stats.lastAiConfidence = confidence;
    stats.lastAiReasoning = reasoning;

    const selected = servers.find(s => s.id === recommendedServerId);
    if (!selected || selected.status !== 'active') {
      return await leastConnectionsRoute(requestData);
    }
    const result = await callServer(selected, requestData);
    stats.aiCount++;
    algoStats['ai'].totalTime += result.responseTime;
    algoStats['ai'].count++;
    stats.algorithmHistory.push({
      algorithm: 'ai',
      server: selected.name,
      responseTime: result.responseTime,
      time: new Date().toISOString(),
      predictions,
      confidence
    });
    return { server: selected, result, predictions, confidence, reasoning };
  } catch (error) {
    console.log('AI service unavailable, falling back to least connections');
    return await leastConnectionsRoute(requestData);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.post('/route', async (req, res) => {
  stats.totalRequests++;
  requestCountSinceLastTick++;

  let routingResult;
  switch (currentAlgorithm) {
    case 'round-robin':      routingResult = await roundRobinRoute(req.body);       break;
    case 'least-connections':routingResult = await leastConnectionsRoute(req.body); break;
    case 'ai':               routingResult = await aiRoute(req.body);               break;
    default:                 routingResult = await roundRobinRoute(req.body);
  }

  if (!routingResult) {
    return res.status(503).json({ error: 'No servers available' });
  }

  broadcastMetrics();

  res.json({
    algorithm: currentAlgorithm,
    server: routingResult.server.name,
    responseTime: routingResult.result.responseTime,
    predictions: routingResult.predictions,
    confidence: routingResult.confidence,
    reasoning: routingResult.reasoning
  });
});

app.post('/algorithm', (req, res) => {
  const { algorithm } = req.body;
  if (['round-robin', 'least-connections', 'ai'].includes(algorithm)) {
    currentAlgorithm = algorithm;
    res.json({ success: true, algorithm: currentAlgorithm });
  } else {
    res.status(400).json({ error: 'Invalid algorithm' });
  }
});

app.get('/metrics', (req, res) => {
  res.json(buildMetricsPayload());
});

app.post('/reset', (req, res) => {
  stats = {
    totalRequests: 0,
    roundRobinCount: 0,
    leastConnCount: 0,
    aiCount: 0,
    avgResponseTime: 0,
    responseTimeCount: 0,
    algorithmHistory: [],
    serverMetrics: [],
    lastAiConfidence: null,
    lastAiReasoning: null
  };
  algoStats = {
    'round-robin':      { totalTime: 0, count: 0 },
    'least-connections':{ totalTime: 0, count: 0 },
    'ai':               { totalTime: 0, count: 0 }
  };
  servers.forEach(s => {
    s.load = 0;
    s.requests = 0;
    s.responseTime = 0;
    s.status = 'active';
    s.degradedAt = null;
  });
  roundRobinIndex = 0;
  requestCountSinceLastTick = 0;
  currentRequestRate = 0;
  broadcastMetrics();
  res.json({ success: true });
});

// ─── Mock Backend Servers ─────────────────────────────────────────────────────
function startMockServers() {
  const serverPorts = [3001, 3002, 3003, 3004];
  serverPorts.forEach((port, idx) => {
    const mockApp = express();
    mockApp.use(express.json());
    mockApp.post('/process', (req, res) => {
      // Simulate varied processing time per server (Server D is intentionally slower)
      const base = [20, 30, 25, 60][idx];
      const processingTime = Math.random() * 80 + base;
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
      console.log(`✓ Mock server ${String.fromCharCode(65 + idx)} running on port ${port}`);
    });
  });
}

// Start everything
startMockServers();

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n🧠 AI Load Balancer started successfully!`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`📈 Analytics: http://localhost:${PORT}/dashboard.html`);
  console.log(`\nWaiting for AI service on port 5000...\n`);
});