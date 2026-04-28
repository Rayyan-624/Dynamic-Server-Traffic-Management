# 🚀 Installation & Startup Guide

**Complete setup instructions for AI Load Balancer System**

---

## ⚡ Quick Start (5 minutes)

### For Windows Users:
```bash
start.bat
```

### For macOS/Linux Users:
```bash
chmod +x start.sh
./start.sh
```

Then open: **http://localhost:3000**

---

## 📋 Prerequisites

### Windows
- Download and install **Node.js** (v14+): https://nodejs.org/
- Download and install **Python** (3.8+): https://www.python.org/
  - ✅ Make sure to check "Add Python to PATH" during installation

### macOS
```bash
# Using Homebrew (install from https://brew.sh/ if needed)
brew install node python@3.11
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install nodejs npm python3 python3-pip
```

---

## 🔧 Manual Installation

### Step 1: Navigate to Project Directory
```bash
cd "c:\FAST\Semester 6\SE\SE Project"
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

This installs:
- `express` - Web framework
- `socket.io` - Real-time communication  
- `axios` - HTTP client
- `cors` - Cross-origin support
- `chart.js` - Charting library

Verify installation:
```bash
npm list
```

### Step 3: Install Python Dependencies

#### Option A: Virtual Environment (Recommended)
```bash
cd service

# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Install packages
pip install -r requirements.txt

# Verify
pip list
```

#### Option B: Global Installation
```bash
cd service
pip install -r requirements.txt
```

### Step 4: Verify All Components

Check Node.js:
```bash
node --version
npm --version
```

Check Python:
```bash
python --version
pip list | findstr Flask  # Windows
pip list | grep Flask      # macOS/Linux
```

---

## 🎯 Running the System

### Configuration A: Terminal Windows (Manual)

**Terminal 1 - Load Balancer:**
```bash
npm start
```
Expected output:
```
✓ Mock server A running on port 3001
✓ Mock server B running on port 3002
✓ Mock server C running on port 3003
✓ Mock server D running on port 3004

🧠 AI Load Balancer started successfully!
📊 Dashboard: http://localhost:3000
📈 Analytics: http://localhost:3000/dashboard.html
```

**Terminal 2 - AI Service:**
```bash
cd service
python app.py
```
Expected output:
```
🚀 Starting AI Service on http://localhost:5000
📊 Endpoints: /predict (POST), /health (GET)
 * Running on http://0.0.0.0:5000
```

**Terminal 3 - Traffic Simulation (Optional):**
```bash
npm run traffic
```

### Configuration B: Batch File (Windows - Automatic)
```bash
start.bat
```

This automatically:
- Checks for Node.js and Python
- Installs missing packages
- Opens 2 new terminal windows
- Starts both services

### Configuration C: Shell Script (macOS/Linux - Automatic)
```bash
chmod +x start.sh
./start.sh
```

---

## 🌐 Accessing the System

Once all services are running:

1. **Dashboard**: Open http://localhost:3000 in your browser
   - Main monitoring interface
   - Real-time server metrics
   - Algorithm selector
   - Request simulator

2. **Analytics**: Open http://localhost:3000/dashboard.html
   - Performance charts
   - Algorithm comparison
   - Historical trends

3. **API Base**: http://localhost:3000/

---

## 🧪 Testing the Installation

### Test 1: Dashboard Access
1. Open http://localhost:3000
2. Should see gradient background and server cards
3. All servers should show "Active" status

### Test 2: Send a Request
1. Click "Send Request" button
2. Watch progress bars update
3. Check browser console (F12) for no errors

### Test 3: Analytics
1. Open http://localhost:3000/dashboard.html
2. Should see empty charts initially
3. Send some requests, charts should update

### Test 4: API Endpoint
Open in browser or use curl:
```bash
curl http://localhost:3000/metrics
```

Should return JSON with server metrics.

---

## 🔍 Port Verification

Make sure these ports are available:

| Port | Service | Check Command |
|------|---------|---------------|
| 3000 | Load Balancer | `netstat -ano \| findstr :3000` |
| 3001 | Server A | `netstat -ano \| findstr :3001` |
| 3002 | Server B | `netstat -ano \| findstr :3002` |
| 3003 | Server C | `netstat -ano \| findstr :3003` |
| 3004 | Server D | `netstat -ano \| findstr :3004` |
| 5000 | AI Service | `netstat -ano \| findstr :5000` |

---

## 🐛 Troubleshooting

### Issue: "npm command not found"
**Solution:** Node.js not installed or not in PATH
```bash
# Verify installation
node --version
npm --version

# Re-install Node.js and restart terminal
```

### Issue: "python command not found"
**Solution:** Python not installed or not in PATH
```bash
# Verify installation
python --version
python3 --version

# If using python3, create alias or adjust path
```

### Issue: "Module not found"
**Solution:** Dependencies not installed
```bash
# Reinstall all packages
rm -r node_modules
npm install

# For Python
pip install --upgrade -r service/requirements.txt
```

### Issue: "Port 3000 already in use"
**Solution:** Kill existing process
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Issue: "Connection refused" when starting
**Solution:** Wait for services to fully start
- Wait 5 seconds after starting Load Balancer before AI Service
- Check that no errors appear in terminal output
- Verify ports are open (no firewall blocking)

### Issue: Dashboard loads but no updates
**Solution:** WebSocket connection issue
```bash
# Check browser console (F12 → Console)
# Should see: "Socket.IO connected"

# If error, try:
# 1. Clear browser cache
# 2. Hard refresh (Ctrl+F5)
# 3. Try incognito/private window
```

---

## 📚 Project Structure After Installation

```
SE Project/
├── node_modules/            # Node dependencies (auto-generated)
├── service/
│   ├── venv/                # Python virtual environment (optional)
│   ├── app.py               # AI service
│   └── requirements.txt
├── public/
│   ├── index.html           # Dashboard
│   ├── dashboard.html       # Analytics
│   ├── script.js
│   ├── analytics.js
│   └── style.css
├── simulation/
│   └── traffic-generator.js
├── package.json             # Node configuration
├── server.js                # Main load balancer
├── README.md                # Project documentation
├── start.bat                # Windows auto-start
└── start.sh                 # Linux/macOS auto-start
```

---

## ✅ Verification Checklist

- [ ] Node.js installed (`node --version` shows v14+)
- [ ] npm installed (`npm --version`)
- [ ] Python installed (`python --version` shows 3.8+)
- [ ] npm dependencies installed (node_modules exists)
- [ ] Python dependencies installed (Flask, flask-cors)
- [ ] Port 3000 available
- [ ] Port 5000 available
- [ ] Load Balancer starts without errors
- [ ] AI Service starts without errors
- [ ] Dashboard loads at http://localhost:3000
- [ ] Can send requests and see updates
- [ ] Analytics page loads charts

---

## 🚀 Next Steps

After successful installation:

1. **Explore Dashboard**: Try different algorithms and observe behavior
2. **Send Requests**: Use the request simulator
3. **Run Simulation**: `npm run traffic` for automated testing
4. **Check Analytics**: Monitor performance metrics
5. **Review Code**: Understand the load balancing algorithms

---

## 📞 Additional Help

- **Node.js Issues**: https://nodejs.org/en/docs/
- **Python Issues**: https://www.python.org/about/help/
- **Flask Documentation**: https://flask.palletsprojects.com/
- **Socket.IO Guide**: https://socket.io/docs/

---

**Status:** ✅ Ready to Use
