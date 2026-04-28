const axios = require('axios');

const LOAD_BALANCER_URL = 'http://localhost:3000/route';

async function sendRequest(requestId) {
    try {
        const response = await axios.post(LOAD_BALANCER_URL, {
            requestId,
            timestamp: Date.now(),
            simulated: true
        });
        console.log(`[${new Date().toLocaleTimeString()}] Request ${requestId}: ${response.data.server} (${response.data.algorithm}) - ${response.data.responseTime}ms`);
        return response.data;
    } catch (error) {
        console.error(`Request ${requestId} failed:`, error.message);
        return null;
    }
}

async function runSimulation() {
    console.log('Starting traffic simulation...\n');
    
    // Pattern 1: Steady stream
    console.log('=== Pattern 1: Steady Stream (10 requests) ===');
    for (let i = 0; i < 10; i++) {
        await sendRequest(i);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Pattern 2: Burst traffic
    console.log('\n=== Pattern 2: Burst Traffic (20 requests in 2 seconds) ===');
    const burstPromises = [];
    for (let i = 10; i < 30; i++) {
        burstPromises.push(sendRequest(i));
    }
    await Promise.all(burstPromises);
    
    // Pattern 3: Ramping up
    console.log('\n=== Pattern 3: Ramping Up ===');
    for (let i = 30; i < 50; i++) {
        await sendRequest(i);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\nSimulation completed!');
}

// Run simulation
runSimulation().catch(console.error);