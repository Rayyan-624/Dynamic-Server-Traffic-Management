# 🧠 AI-Based Intelligent Load Balancing System

**Course:** CS3009 - Software Engineering

**Team Members:**
- S.M. Rayyan (23K-0624)
- Ali Haider (23K-0848)  
- Muhammad Zohib (23K-0602)

---

## 📋 Overview

This is a complete AI-powered load balancing system that intelligently routes incoming traffic to backend servers using machine learning predictions. The system compares three algorithms in real-time: Round Robin, Least Connections, and AI-Powered routing.

### Key Features ✨
- **Three Load Balancing Algorithms**: Compare performance of different routing strategies
- **Real-time Monitoring Dashboard**: Live server metrics and status updates via WebSocket
- **AI Prediction Engine**: Machine learning-based server load forecasting
- **Interactive Analytics**: Performance charts and algorithm comparison
- **Request Simulator**: Simulate traffic patterns for testing
- **Mock Backend Servers**: 4 simulated backend servers with varied performance
- **Responsive UI**: Modern dark theme with glassmorphism design

---

## 🏗️ Project Architecture

```
Load Balancer (Node.js - Port 3000)
    ├── Frontend Dashboard (Port 3000)
    ├── Analytics Page
    └── 4 Mock Backend Servers (Ports 3001-3004)
         │
         └── AI Service (Flask - Port 5000)
```

### Components:
- **Load Balancer** (Node.js/Express): Routes requests using selected algorithm
- **AI Service** (Python/Flask): Predicts server loads and recommends best server
- **Frontend**: Real-time dashboard with metrics, charts, and controls
- **Mock Servers**: Simulate backend services with varied response times

---

## 🚀 Quick Start (30 seconds)

### **1. Install Dependencies**
```bash
npm install
pip install -r service/requirements.txt
```

### **2. Start All Services**

**Option A: Manual (3 Terminal Windows)**

Terminal 1 - Load Balancer:
```bash
npm start
```

Terminal 2 - AI Service:
```bash
cd service
python app.py
```

Terminal 3 - Traffic Generator (optional):
```bash
npm run traffic
```

**Option B: Quick Start Script (Recommended)**

Create `start.bat` in project root:
```batch
@echo off
echo Starting AI Load Balancer System...
echo.

start cmd /k "title Load Balancer & npm start"
timeout /t 2
start cmd /k "title AI Service & cd service && python app.py"
timeout /t 2
echo.
echo ✓ All services started!
echo.
echo Dashboard: http://localhost:3000
echo Analytics: http://localhost:3000/dashboard.html
echo.
pause
```

Then run:
```bash
start.bat
```

### **3. Open Dashboard**
```
Dashboard: http://localhost:3000
Analytics: http://localhost:3000/dashboard.html
```

---

## 📚 Detailed Setup

### Prerequisites
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **Python** (3.8+) - [Download](https://www.python.org/)
- **npm** (comes with Node.js)

### Step 1: Clone/Download Project
```bash
cd c:\FAST\Semester\ 6\SE\SE\ Project
```

### Step 2: Install Node Dependencies
```bash
npm install
```

This installs:
- express (web framework)
- socket.io (real-time communication)
- axios (HTTP client)
- cors (cross-origin support)
- chart.js (charting library)

### Step 3: Install Python Dependencies
```bash
cd service
pip install -r requirements.txt
cd ..
```

This installs:
- Flask (web framework)
- flask-cors (CORS support)

### Step 4: Verify Port Availability
Make sure these ports are available:
- **3000** - Main load balancer & dashboard
- **3001-3004** - Mock backend servers
- **5000** - AI service

Check if ports are in use:
```bash
netstat -ano | findstr :3000
netstat -ano | findstr :5000
```

---

## 🎮 Using the System

### Dashboard (Main Page)
1. **Algorithm Selection**: Choose between Round Robin, Least Connections, or AI-Powered
2. **Server Status Cards**: Real-time CPU load visualization with progress bars
3. **AI Panel**: Shows AI confidence and reasoning for recommendations
4. **Request Simulator**: Send manual requests or run automated patterns

### Analytics Dashboard
View real-time performance metrics:
- Algorithm distribution (pie chart)
- Server load trends (line chart)
- Response time comparison (bar chart)
- Request rate over time (line chart)

### Testing

**Method 1: Manual Requests**
1. Click "Send Request" button
2. Watch real-time updates in dashboard

**Method 2: Batch Requests**
1. Set batch size (e.g., 20)
2. Click "Send Batch"
3. Observe load distribution

**Method 3: Auto Mode**
1. Click "Auto Mode" to simulate continuous traffic
2. Watch servers load up gradually
3. Click "Stop Auto" to pause

**Method 4: Traffic Simulation**
```bash
npm run traffic
```

This runs a sophisticated traffic pattern:
- Warm-up phase (steady requests)
- Burst traffic (high concurrency)
- Gradual load increase
- Final spike test

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# For port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -r node_modules
npm install

# For Python
pip install --upgrade pip
pip install -r service/requirements.txt
```

### AI Service Not Connecting
- Verify Flask is running on port 5000
- Check Python installation: `python --version`
- Try running Flask manually: `cd service && python app.py`

### Dashboard Not Loading
- Clear browser cache (Ctrl+Shift+Del)
- Try incognito/private window
- Check console for errors (F12)

---

## 📊 API Endpoints

### Load Balancer APIs

**POST /route** - Route a request
```json
{
  "data": { "requestId": 123 }
}
```
Response:
```json
{
  "algorithm": "ai",
  "server": "Server A",
  "responseTime": 45,
  "confidence": 0.92,
  "reasoning": "Server A has lowest predicted load"
}
```

**POST /algorithm** - Switch algorithm
```json
{
  "algorithm": "round-robin"
}
```

**GET /metrics** - Get current metrics
```json
{
  "stats": { ... },
  "servers": [ ... ],
  "currentAlgorithm": "ai"
}
```

**POST /reset** - Reset statistics
```bash
curl -X POST http://localhost:3000/reset
```

### AI Service APIs

**POST /predict** - Get load predictions
```json
{
  "current_loads": [20, 35, 50, 60],
  "request_rate": 10,
  "time_of_day": 14,
  "active_servers": [1, 2, 3, 4]
}
```

**GET /health** - Health check
```bash
curl http://localhost:5000/health
```

---

## 🎨 UI Features

### Modern Design
- Dark theme with glassmorphism effects
- Smooth animations and transitions
- Real-time progress bar animations
- Responsive design for all screen sizes

### Real-time Updates
- WebSocket-based live metrics (3s intervals)
- Instant server status changes
- Live request logging
- Animated load bars

### Performance Metrics
- Total requests count
- Average response time
- Algorithm distribution
- Server-specific metrics

---

## 📈 Project Structure

```
SE Project/
├── server.js                 # Main load balancer
├── package.json             # Node dependencies
├── README.md                # This file
│
├── public/
│   ├── index.html           # Main dashboard
│   ├── dashboard.html       # Analytics page
│   ├── script.js            # Dashboard logic
│   ├── analytics.js         # Analytics logic
│   └── style.css            # Styling
│
├── service/
│   ├── app.py               # AI service (Flask)
│   └── requirements.txt     # Python dependencies
│
└── simulation/
    └── traffic-generator.js # Load testing script
```

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Load
```bash
# Manual: Click "Send Request" 5-10 times
# Watch even distribution across servers
```

### Scenario 2: Burst Traffic
```bash
# Manual: Set batch to 30, click "Send Batch"
# Observe all servers loading equally (AI should distribute well)
```

### Scenario 3: Continuous Load
```bash
# Manual: Click "Auto Mode" and let it run for 30 seconds
# Check analytics for load trends
```

### Scenario 4: Full Stress Test
```bash
npm run traffic
# Automated test with 4 traffic patterns
```

---

## 💡 How AI Algorithm Works

The AI prediction engine:
1. **Analyzes** current server loads
2. **Considers** request rate and time of day
3. **Predicts** future load for each server
4. **Recommends** server with lowest predicted load
5. **Learns** from historical data patterns

Load Prediction Formula:
```
Predicted Load = Current Load + (Request Rate × 0.1 × Time Factor × Server Factor)
Time Factor = 1.2 (peak hours 9-17), 0.8 (otherwise)
Server Factor = 1.3 (Server D - slower), 1.0 (others)
```

---

## 🐛 Known Issues & Fixes

| Issue | Solution |
|-------|----------|
| Dashboard won't load | Clear browser cache, hard refresh (Ctrl+F5) |
| Requests failing | Ensure all 3 services are running |
| Load bars not updating | Check WebSocket connection in browser DevTools |
| AI not connecting | Verify port 5000, Flask running |
| High response times | Normal for Server D (intentionally slower) |

---

## 📝 Development Notes

### Adding New Algorithms
Edit `server.js` and add:
```javascript
async function newAlgorithmRoute(requestData) {
  // Your algorithm logic
  return { server: selected, result };
}
```

### Modifying UI
Edit `public/style.css` for styling, `public/index.html` for layout

### Adjusting AI Parameters
Edit `service/app.py` in `predict_loads()` function

---

## 🎓 Learning Outcomes

- **Load Balancing**: Understand different routing strategies
- **Distributed Systems**: Multi-server architecture design
- **Machine Learning**: Practical ML application in load prediction
- **Full-Stack Development**: Front-end, back-end, and AI integration
- **Real-time Systems**: WebSocket and live data updates

---

## 📞 Support & Questions

For issues or questions:
1. Check the **Troubleshooting** section above
2. Review the **API Endpoints** documentation
3. Check browser console for errors (F12 → Console)
4. Verify all services are running on correct ports

---

**Last Updated:** December 2024  
**Status:** ✅ Fully Functional & Tested