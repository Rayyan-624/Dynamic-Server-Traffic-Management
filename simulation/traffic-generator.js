const axios = require('axios');

const LOAD_BALANCER_URL = 'http://localhost:3000/route';

let totalRequests = 0;
let successCount = 0;
let failureCount = 0;
let totalTime = 0;

async function sendRequest(requestId) {
    try {
        const startTime = Date.now();
        const response = await axios.post(LOAD_BALANCER_URL, {
            requestId,
            timestamp: Date.now(),
            simulated: true
        }, { timeout: 5000 });
        const duration = Date.now() - startTime;
        totalRequests++;
        successCount++;
        totalTime += duration;
        
        const algo = response.data.algorithm === 'ai' ? '🧠 AI' : 
                     response.data.algorithm === 'round-robin' ? '🔄 RR' : '🔗 LC';
        console.log(`[${new Date().toLocaleTimeString()}] ✓ Req #${requestId}: ${response.data.server} via ${algo} (${duration}ms)`);
        return response.data;
    } catch (error) {
        totalRequests++;
        failureCount++;
        console.error(`[${new Date().toLocaleTimeString()}] ✗ Req #${requestId} failed: ${error.message}`);
        return null;
    }
}

async function runSimulation() {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║     AI LOAD BALANCER - TRAFFIC SIMULATION           ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    try {
        // Test connection first
        console.log('🔍 Testing connection to load balancer...');
        await axios.get('http://localhost:3000/metrics', { timeout: 2000 });
        console.log('✓ Load balancer is ready!\n');
    } catch (error) {
        console.error('✗ Cannot connect to load balancer. Make sure it\'s running on port 3000!\n');
        process.exit(1);
    }
    
    // Pattern 1: Warm up
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Pattern 1: Warm Up (Steady Stream)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (let i = 0; i < 8; i++) {
        await sendRequest(i);
        await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    console.log('\n─ Pausing 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Pattern 2: Burst traffic
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Pattern 2: Burst Traffic (High Load)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const burstPromises = [];
    for (let i = 8; i < 28; i++) {
        burstPromises.push(sendRequest(i));
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    await Promise.all(burstPromises);
    
    console.log('\n─ Pausing 1 second...\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Pattern 3: Gradual increase
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Pattern 3: Gradual Load Increase');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (let i = 28; i < 43; i++) {
        await sendRequest(i);
        const delay = Math.max(50, 250 - (i - 28) * 8);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.log('\n─ Pausing 1 second...\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Pattern 4: Final spike
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Pattern 4: Final Spike (Stress Test)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const spikePromises = [];
    for (let i = 43; i < 58; i++) {
        spikePromises.push(sendRequest(i));
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    await Promise.all(spikePromises);
    
    // Summary
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║                 SIMULATION SUMMARY                  ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`📊 Total Requests:    ${totalRequests}`);
    console.log(`✓  Successful:        ${successCount} (${((successCount/totalRequests)*100).toFixed(1)}%)`);
    console.log(`✗  Failed:            ${failureCount} (${((failureCount/totalRequests)*100).toFixed(1)}%)`);
    console.log(`⏱️  Avg Response Time: ${(totalTime/totalRequests).toFixed(0)}ms`);
    console.log('\n✅ Simulation completed! Check the dashboard for results.\n');
}

// Run simulation
runSimulation().catch(console.error);