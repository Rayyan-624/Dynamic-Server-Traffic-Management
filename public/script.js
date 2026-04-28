const socket = io();
let autoModeInterval = null;

// Initialize charts
let loadChart = null;

// DOM Elements
const algoButtons = document.querySelectorAll('.algo-btn');
const sendSingleBtn = document.getElementById('send-single');
const sendBatchBtn = document.getElementById('send-batch');
const autoModeBtn = document.getElementById('auto-mode');
const resetStatsBtn = document.getElementById('reset-stats');
const batchSizeInput = document.getElementById('batch-size');

// Update server cards
function updateServerCards(servers) {
    servers.forEach((server, index) => {
        const card = document.querySelector(`.server-card[data-server="${server.id}"]`);
        if (card) {
            card.querySelector('.load-value').textContent = server.load;
            card.querySelector('.progress-fill').style.width = `${server.load}%`;
            card.querySelector('.requests-count').textContent = server.requests;
            card.querySelector('.response-time').textContent = server.responseTime;
            
            const statusSpan = card.querySelector('.server-status');
            statusSpan.textContent = server.status === 'active' ? 'Active' : 'Degraded';
            statusSpan.className = `server-status status-${server.status}`;
        }
    });
}

// Update global stats
function updateGlobalStats(stats) {
    document.getElementById('total-requests').textContent = stats.totalRequests;
    document.getElementById('avg-response').textContent = Math.round(stats.avgResponseTime);
    document.getElementById('rr-count').textContent = stats.roundRobinCount;
    document.getElementById('lc-count').textContent = stats.leastConnCount;
    document.getElementById('ai-count').textContent = stats.aiCount;
}

// Add log entry
function addLogEntry(message, type = 'info') {
    const logContent = document.querySelector('.log-content');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContent.insertBefore(entry, logContent.firstChild);
    
    // Keep only last 50 entries
    while (logContent.children.length > 50) {
        logContent.removeChild(logContent.lastChild);
    }
}

// Send request
async function sendRequest(requestData = {}) {
    try {
        const response = await fetch('/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: requestData, timestamp: Date.now() })
        });
        const result = await response.json();
        addLogEntry(`Request routed to ${result.server} using ${result.algorithm} (${result.responseTime}ms)`);
        return result;
    } catch (error) {
        addLogEntry(`Error: ${error.message}`, 'error');
        return null;
    }
}

// Send batch requests
async function sendBatch(count) {
    addLogEntry(`Sending batch of ${count} requests...`);
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(sendRequest({ requestId: i, batch: true }));
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    }
    await Promise.all(promises);
    addLogEntry(`Batch of ${count} requests completed`);
}

// Change algorithm
async function changeAlgorithm(algorithm) {
    try {
        const response = await fetch('/algorithm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ algorithm })
        });
        const result = await response.json();
        if (result.success) {
            addLogEntry(`Switched to ${algorithm} algorithm`);
            document.getElementById('current-algo').textContent = 
                algorithm === 'round-robin' ? 'Round Robin' :
                algorithm === 'least-connections' ? 'Least Connections' : 'AI-Powered';
        }
    } catch (error) {
        addLogEntry(`Failed to change algorithm: ${error.message}`, 'error');
    }
}

// Reset stats
async function resetStats() {
    try {
        await fetch('/reset', { method: 'POST' });
        addLogEntry('Statistics reset');
    } catch (error) {
        addLogEntry(`Failed to reset stats: ${error.message}`, 'error');
    }
}

// Auto mode toggle
function toggleAutoMode() {
    if (autoModeInterval) {
        clearInterval(autoModeInterval);
        autoModeInterval = null;
        autoModeBtn.textContent = '▶ Auto Mode';
        autoModeBtn.style.background = '#ff9800';
        addLogEntry('Auto mode stopped');
    } else {
        autoModeInterval = setInterval(() => {
            sendRequest({ auto: true });
        }, 1000);
        autoModeBtn.textContent = '⏸ Stop Auto';
        autoModeBtn.style.background = '#f44336';
        addLogEntry('Auto mode started (1 request/second)');
    }
}

// Socket.io event handlers
socket.on('connect', () => {
    addLogEntry('Connected to load balancer');
});

socket.on('metrics', (data) => {
    updateServerCards(data.servers);
    updateGlobalStats(data.stats);
});

// Event listeners
algoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        algoButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        changeAlgorithm(btn.dataset.algo);
    });
});

sendSingleBtn.addEventListener('click', () => sendRequest({ manual: true }));
sendBatchBtn.addEventListener('click', () => {
    const batchSize = parseInt(batchSizeInput.value);
    if (batchSize > 0 && batchSize <= 100) {
        sendBatch(batchSize);
    } else {
        addLogEntry('Invalid batch size (1-100)', 'error');
    }
});
autoModeBtn.addEventListener('click', toggleAutoMode);
resetStatsBtn.addEventListener('click', resetStats);

// Initial load
addLogEntry('Dashboard ready. AI Load Balancer is running!');