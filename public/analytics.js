const socket = io();

let algorithmChart = null;
let loadChart = null;
let responseChart = null;
let rateChart = null;

let lastTotalRequests = 0;
let lastTimestamp = Date.now();

// ── Clock ─────────────────────────────────────────────────────────────────
function updateClock() {
    const clockEl = document.getElementById('live-clock');
    if (clockEl) clockEl.textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// ── Chart defaults: dark theme ────────────────────────────────────────────
Chart.defaults.color = '#7986cb';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

const COLORS = {
    rr: '#FF6384',
    lc: '#36A2EB',
    ai: '#4CAF50',
    serverA: '#FF6384',
    serverB: '#36A2EB',
    serverC: '#FFCE56',
    serverD: '#4CAF50',
    rate: '#6c63ff'
};

// ── Initialise charts ─────────────────────────────────────────────────────
function initCharts() {
    const darkBg = '#0a0e27';

    // Pie – Algorithm Distribution
    algorithmChart = new Chart(document.getElementById('algorithmChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Round Robin', 'Least Connections', 'AI-Powered'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [COLORS.rr, COLORS.lc, COLORS.ai],
                borderColor: darkBg,
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#7986cb', padding: 16 } }
            }
        }
    });

    // Line – Server Load Trends
    loadChart = new Chart(document.getElementById('loadChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Server A', borderColor: COLORS.serverA, backgroundColor: COLORS.serverA + '20', data: [], tension: 0.4, fill: true, pointRadius: 2 },
                { label: 'Server B', borderColor: COLORS.serverB, backgroundColor: COLORS.serverB + '20', data: [], tension: 0.4, fill: true, pointRadius: 2 },
                { label: 'Server C', borderColor: COLORS.serverC, backgroundColor: COLORS.serverC + '20', data: [], tension: 0.4, fill: true, pointRadius: 2 },
                { label: 'Server D', borderColor: COLORS.serverD, backgroundColor: COLORS.serverD + '20', data: [], tension: 0.4, fill: true, pointRadius: 2 }
            ]
        },
        options: {
            responsive: true,
            animation: { duration: 400 },
            scales: {
                y: { min: 0, max: 100, ticks: { callback: v => v + '%' } }
            },
            plugins: { legend: { labels: { color: '#7986cb' } } }
        }
    });

    // Bar – Response Time per Algorithm
    responseChart = new Chart(document.getElementById('responseChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Round Robin', 'Least Connections', 'AI-Powered'],
            datasets: [{
                label: 'Avg Response Time (ms)',
                backgroundColor: [COLORS.rr + 'cc', COLORS.lc + 'cc', COLORS.ai + 'cc'],
                borderColor: [COLORS.rr, COLORS.lc, COLORS.ai],
                borderWidth: 2,
                borderRadius: 8,
                data: [0, 0, 0]
            }]
        },
        options: {
            responsive: true,
            animation: { duration: 400 },
            scales: { y: { beginAtZero: true, ticks: { callback: v => v + 'ms' } } },
            plugins: { legend: { display: false } }
        }
    });

    // Line – Request Rate
    rateChart = new Chart(document.getElementById('rateChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Requests / sec',
                borderColor: COLORS.rate,
                backgroundColor: COLORS.rate + '25',
                data: [],
                tension: 0.4,
                fill: true,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            animation: { duration: 400 },
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { labels: { color: '#7986cb' } } }
        }
    });
}

// ── Update comparison table ───────────────────────────────────────────────
function updateComparisonTable(stats) {
    document.getElementById('rr-total').textContent = stats.roundRobinCount;
    document.getElementById('lc-total').textContent = stats.leastConnCount;
    document.getElementById('ai-total').textContent = stats.aiCount;

    const perAlgo = stats.perAlgoAvgResponse || {};
    document.getElementById('rr-avg').textContent = `${perAlgo['round-robin'] || 0}ms`;
    document.getElementById('lc-avg').textContent = `${perAlgo['least-connections'] || 0}ms`;
    document.getElementById('ai-avg').textContent = `${perAlgo['ai'] || 0}ms`;
}

// ── Socket events ─────────────────────────────────────────────────────────
socket.on('metrics', (data) => {
    const now = new Date().toLocaleTimeString();

    // Doughnut – Algorithm Distribution
    algorithmChart.data.datasets[0].data = [
        data.stats.roundRobinCount,
        data.stats.leastConnCount,
        data.stats.aiCount
    ];
    algorithmChart.update();

    // Load trend
    if (loadChart.data.labels.length > 25) {
        loadChart.data.labels.shift();
        loadChart.data.datasets.forEach(ds => ds.data.shift());
    }
    loadChart.data.labels.push(now);
    data.servers.forEach((server, idx) => {
        loadChart.data.datasets[idx].data.push(server.load);
    });
    loadChart.update();

    // Response time per algorithm from backend-computed per-algo averages
    const perAlgo = data.stats.perAlgoAvgResponse || {};
    responseChart.data.datasets[0].data = [
        perAlgo['round-robin'] || 0,
        perAlgo['least-connections'] || 0,
        perAlgo['ai'] || 0
    ];
    responseChart.update();

    // Request rate (requests since last update / elapsed seconds)
    const nowMs = Date.now();
    const elapsed = (nowMs - lastTimestamp) / 1000;
    const delta = data.stats.totalRequests - lastTotalRequests;
    const rate = elapsed > 0 ? parseFloat((delta / elapsed).toFixed(2)) : 0;
    lastTotalRequests = data.stats.totalRequests;
    lastTimestamp = nowMs;

    if (rateChart.data.labels.length > 25) {
        rateChart.data.labels.shift();
        rateChart.data.datasets[0].data.shift();
    }
    rateChart.data.labels.push(now);
    rateChart.data.datasets[0].data.push(rate);
    rateChart.update();

    updateComparisonTable(data.stats);
});

// ── Initial fetch ─────────────────────────────────────────────────────────
(async () => {
    initCharts();
    try {
        const res = await fetch('/metrics');
        const data = await res.json();
        // Pre-fill algorithm distribution
        algorithmChart.data.datasets[0].data = [
            data.stats.roundRobinCount,
            data.stats.leastConnCount,
            data.stats.aiCount
        ];
        algorithmChart.update();
        updateComparisonTable(data.stats);
    } catch (e) {
        console.warn('Could not fetch initial metrics:', e.message);
    }
})();