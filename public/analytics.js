const socket = io();
let algorithmChart = null;
let loadChart = null;
let responseChart = null;
let rateChart = null;

// Historical data
let historyData = {
    timestamps: [],
    serverLoads: [[], [], [], []],
    responseTimes: { 'round-robin': [], 'least-connections': [], 'ai': [] },
    requestRates: []
};

// Initialize charts
function initCharts() {
    const ctx1 = document.getElementById('algorithmChart').getContext('2d');
    algorithmChart = new Chart(ctx1, {
        type: 'pie',
        data: {
            labels: ['Round Robin', 'Least Connections', 'AI-Powered'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#FF6384', '#36A2EB', '#4CAF50']
            }]
        }
    });
    
    const ctx2 = document.getElementById('loadChart').getContext('2d');
    loadChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Server A', borderColor: '#FF6384', data: [] },
                { label: 'Server B', borderColor: '#36A2EB', data: [] },
                { label: 'Server C', borderColor: '#FFCE56', data: [] },
                { label: 'Server D', borderColor: '#4CAF50', data: [] }
            ]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
    
    const ctx3 = document.getElementById('responseChart').getContext('2d');
    responseChart = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: ['Round Robin', 'Least Connections', 'AI-Powered'],
            datasets: [{ label: 'Avg Response Time (ms)', backgroundColor: '#667eea', data: [0, 0, 0] }]
        }
    });
    
    const ctx4 = document.getElementById('rateChart').getContext('2d');
    rateChart = new Chart(ctx4, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{ label: 'Requests per Second', borderColor: '#ff9800', data: [] }]
        }
    });
}

// Update comparison table
function updateComparisonTable(stats) {
    document.getElementById('rr-total').textContent = stats.roundRobinCount;
    document.getElementById('lc-total').textContent = stats.leastConnCount;
    document.getElementById('ai-total').textContent = stats.aiCount;
    
    // Calculate averages from history
    const rrAvg = historyData.responseTimes['round-robin'].length > 0 
        ? (historyData.responseTimes['round-robin'].reduce((a,b) => a+b, 0) / historyData.responseTimes['round-robin'].length).toFixed(0)
        : 0;
    const lcAvg = historyData.responseTimes['least-connections'].length > 0
        ? (historyData.responseTimes['least-connections'].reduce((a,b) => a+b, 0) / historyData.responseTimes['least-connections'].length).toFixed(0)
        : 0;
    const aiAvg = historyData.responseTimes['ai'].length > 0
        ? (historyData.responseTimes['ai'].reduce((a,b) => a+b, 0) / historyData.responseTimes['ai'].length).toFixed(0)
        : 0;
    
    document.getElementById('rr-avg').textContent = `${rrAvg}ms`;
    document.getElementById('lc-avg').textContent = `${lcAvg}ms`;
    document.getElementById('ai-avg').textContent = `${aiAvg}ms`;
}

// Socket event handlers
socket.on('metrics', (data) => {
    // Update pie chart
    algorithmChart.data.datasets[0].data = [
        data.stats.roundRobinCount,
        data.stats.leastConnCount,
        data.stats.aiCount
    ];
    algorithmChart.update();
    
    // Update load chart
    const now = new Date().toLocaleTimeString();
    loadChart.data.labels.push(now);
    data.servers.forEach((server, idx) => {
        loadChart.data.datasets[idx].data.push(server.load);
        if (loadChart.data.datasets[idx].data.length > 20) {
            loadChart.data.datasets[idx].data.shift();
        }
    });
    if (loadChart.data.labels.length > 20) loadChart.data.labels.shift();
    loadChart.update();
    
    // Update response chart (from history)
    if (data.recentHistory) {
        data.recentHistory.forEach(entry => {
            if (entry.responseTime) {
                historyData.responseTimes[entry.algorithm].push(entry.responseTime);
                if (historyData.responseTimes[entry.algorithm].length > 50) {
                    historyData.responseTimes[entry.algorithm].shift();
                }
            }
        });
        
        const rrAvg = historyData.responseTimes['round-robin'].length > 0 
            ? historyData.responseTimes['round-robin'].reduce((a,b) => a+b, 0) / historyData.responseTimes['round-robin'].length
            : 0;
        const lcAvg = historyData.responseTimes['least-connections'].length > 0
            ? historyData.responseTimes['least-connections'].reduce((a,b) => a+b, 0) / historyData.responseTimes['least-connections'].length
            : 0;
        const aiAvg = historyData.responseTimes['ai'].length > 0
            ? historyData.responseTimes['ai'].reduce((a,b) => a+b, 0) / historyData.responseTimes['ai'].length
            : 0;
        
        responseChart.data.datasets[0].data = [rrAvg, lcAvg, aiAvg];
        responseChart.update();
    }
    
    updateComparisonTable(data.stats);
});

// Initialize
initCharts();