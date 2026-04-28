const socket = io();
let autoModeInterval = null;
const startTime = Date.now();

// ── DOM ──────────────────────────────────────────────────────────────────────
const algoButtons = document.querySelectorAll('.algo-btn');
const sendSingleBtn = document.getElementById('send-single');
const sendBatchBtn = document.getElementById('send-batch');
const autoModeBtn = document.getElementById('auto-mode');
const resetStatsBtn = document.getElementById('reset-stats');
const batchSizeInput = document.getElementById('batch-size');

// ── Clock & Uptime ─────────────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('live-clock');
    const uptimeEl = document.getElementById('uptime');
    if (clockEl) clockEl.textContent = now.toLocaleTimeString();
    if (uptimeEl) {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        if (secs < 60) uptimeEl.textContent = `${secs}s`;
        else if (secs < 3600) uptimeEl.textContent = `${Math.floor(secs/60)}m ${secs%60}s`;
        else uptimeEl.textContent = `${Math.floor(secs/3600)}h ${Math.floor((secs%3600)/60)}m`;
    }
}
setInterval(updateClock, 1000);
updateClock();

// ── Progress bar tier coloring ────────────────────────────────────────────
function getLoadLevel(load) {
    if (load < 50) return { label: 'Low', cls: '' };
    if (load < 80) return { label: 'Medium', cls: 'warn' };
    return { label: 'High', cls: 'danger' };
}

// ── Update server cards ───────────────────────────────────────────────────
function updateServerCards(servers) {
    servers.forEach(server => {
        const card = document.querySelector(`.server-card[data-server="${server.id}"]`);
        if (!card) return;

        // Load values
        card.querySelector('.load-value').textContent = server.load;
        const fill = card.querySelector('.progress-fill');
        fill.style.width = `${server.load}%`;

        // Color tier
        const tier = getLoadLevel(server.load);
        fill.className = 'progress-fill' + (tier.cls ? ' ' + tier.cls : '');

        // Load level text
        const pctEl = document.getElementById(`load-pct-${server.id}`);
        if (pctEl) pctEl.textContent = tier.label;

        // Request & response
        card.querySelector('.requests-count').textContent = server.requests;
        card.querySelector('.response-time').textContent = server.responseTime;

        // Status
        const statusSpan = document.getElementById(`status-${server.id}`);
        const dot = document.getElementById(`dot-${server.id}`);
        if (statusSpan) {
            const isActive = server.status === 'active';
            statusSpan.textContent = isActive ? 'Active' : 'Degraded';
            statusSpan.className = `server-status status-${server.status}`;
            if (dot) dot.className = `server-dot ${server.status}`;
        }
    });
}

// ── Update stats ──────────────────────────────────────────────────────────
function updateGlobalStats(stats) {
    document.getElementById('total-requests').textContent = stats.totalRequests;
    document.getElementById('avg-response').textContent = Math.round(stats.avgResponseTime);
    document.getElementById('rr-count').textContent = stats.roundRobinCount;
    document.getElementById('lc-count').textContent = stats.leastConnCount;
    document.getElementById('ai-count').textContent = stats.aiCount;
}

// ── AI Panel ──────────────────────────────────────────────────────────────
function updateAiPanel(stats) {
    const confEl = document.getElementById('ai-confidence');
    const recEl = document.getElementById('ai-recommended');
    const reasonEl = document.getElementById('ai-reasoning');

    if (stats.lastAiConfidence !== null && stats.lastAiConfidence !== undefined) {
        confEl.textContent = `${(stats.lastAiConfidence * 100).toFixed(0)}%`;
    }
    if (stats.lastAiReasoning) {
        reasonEl.textContent = stats.lastAiReasoning;
        // Extract server name from reasoning
        const match = stats.lastAiReasoning.match(/Server (\d+)/);
        if (match) {
            const serverNames = ['', 'A', 'B', 'C', 'D'];
            recEl.textContent = `Server ${serverNames[parseInt(match[1])] || match[1]}`;
        }
    }
}

// ── Log ───────────────────────────────────────────────────────────────────
function addLogEntry(message, type = 'info') {
    const logContent = document.querySelector('.log-content');
    if (!logContent) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContent.insertBefore(entry, logContent.firstChild);
    while (logContent.children.length > 60) {
        logContent.removeChild(logContent.lastChild);
    }
}

// ── Send request ──────────────────────────────────────────────────────────
async function sendRequest(requestData = {}) {
    try {
        const response = await fetch('/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: requestData, timestamp: Date.now() })
        });
        const result = await response.json();
        if (result.error) {
            addLogEntry(`⚠ ${result.error}`, 'error');
            return null;
        }
        const aiNote = result.confidence ? ` [conf: ${(result.confidence * 100).toFixed(0)}%]` : '';
        addLogEntry(`→ ${result.server} via ${result.algorithm} (${result.responseTime}ms)${aiNote}`, 'success');
        return result;
    } catch (error) {
        addLogEntry(`✗ ${error.message}`, 'error');
        return null;
    }
}

// ── Batch requests ────────────────────────────────────────────────────────
async function sendBatch(count) {
    addLogEntry(`📦 Sending batch of ${count} requests…`, 'info');
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(sendRequest({ requestId: i, batch: true }));
        await new Promise(r => setTimeout(r, 20));
    }
    await Promise.all(promises);
    addLogEntry(`✓ Batch of ${count} complete`, 'success');
}

// ── Algorithm switch ──────────────────────────────────────────────────────
async function changeAlgorithm(algorithm) {
    try {
        const response = await fetch('/algorithm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ algorithm })
        });
        const result = await response.json();
        if (result.success) {
            const labels = { 'round-robin': 'Round Robin', 'least-connections': 'Least Connections', 'ai': 'AI-Powered' };
            document.getElementById('current-algo').textContent = labels[algorithm] || algorithm;
            addLogEntry(`⚡ Switched to ${labels[algorithm]}`, 'info');

            // Show/hide AI panel
            const panel = document.getElementById('ai-panel-card');
            if (panel) panel.style.display = algorithm === 'ai' ? '' : 'none';
        }
    } catch (error) {
        addLogEntry(`✗ Failed to switch algorithm: ${error.message}`, 'error');
    }
}

// ── Reset ─────────────────────────────────────────────────────────────────
async function resetStats() {
    try {
        await fetch('/reset', { method: 'POST' });
        addLogEntry('🗑 Statistics reset', 'info');
    } catch (error) {
        addLogEntry(`✗ Reset failed: ${error.message}`, 'error');
    }
}

// ── Auto mode ─────────────────────────────────────────────────────────────
function toggleAutoMode() {
    if (autoModeInterval) {
        clearInterval(autoModeInterval);
        autoModeInterval = null;
        autoModeBtn.textContent = '▶ Auto Mode';
        autoModeBtn.classList.remove('running');
        addLogEntry('⏹ Auto mode stopped', 'info');
    } else {
        autoModeInterval = setInterval(() => sendRequest({ auto: true }), 800);
        autoModeBtn.textContent = '⏸ Stop Auto';
        autoModeBtn.classList.add('running');
        addLogEntry('▶ Auto mode started (1.25 req/s)', 'info');
    }
}

// ── Socket events ─────────────────────────────────────────────────────────
socket.on('connect', () => addLogEntry('✓ Connected to load balancer', 'success'));
socket.on('disconnect', () => addLogEntry('✗ Disconnected from server', 'error'));

socket.on('metrics', (data) => {
    updateServerCards(data.servers);
    updateGlobalStats(data.stats);
    updateAiPanel(data.stats);
});

// ── Button listeners ──────────────────────────────────────────────────────
algoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        algoButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        changeAlgorithm(btn.dataset.algo);
    });
});

sendSingleBtn.addEventListener('click', () => sendRequest({ manual: true }));

sendBatchBtn.addEventListener('click', () => {
    const n = parseInt(batchSizeInput.value);
    if (n > 0 && n <= 100) sendBatch(n);
    else addLogEntry('⚠ Batch size must be 1–100', 'error');
});

autoModeBtn.addEventListener('click', toggleAutoMode);
resetStatsBtn.addEventListener('click', resetStats);

// ── Initial fetch on page load ────────────────────────────────────────────
(async () => {
    try {
        const res = await fetch('/metrics');
        const data = await res.json();
        updateServerCards(data.servers);
        updateGlobalStats(data.stats);
        updateAiPanel(data.stats);

        // Sync algorithm button state
        const currentAlgo = data.currentAlgorithm;
        algoButtons.forEach(b => {
            b.classList.toggle('active', b.dataset.algo === currentAlgo);
        });
        const labels = { 'round-robin': 'Round Robin', 'least-connections': 'Least Connections', 'ai': 'AI-Powered' };
        const el = document.getElementById('current-algo');
        if (el) el.textContent = labels[currentAlgo] || currentAlgo;

        // Show/hide AI panel
        const panel = document.getElementById('ai-panel-card');
        if (panel) panel.style.display = currentAlgo === 'ai' ? '' : 'none';

        addLogEntry('🚀 Dashboard initialised – AI Load Balancer ready!', 'success');
    } catch (e) {
        addLogEntry(`⚠ Could not fetch initial metrics: ${e.message}`, 'error');
    }
})();