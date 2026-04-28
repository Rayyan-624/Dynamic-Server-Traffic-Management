from flask import Flask, request, jsonify
from flask_cors import CORS
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

class AILoadBalancer:
    def __init__(self):
        """Initialize AI Load Balancer with simple ML model"""
        self.load_history = []
        
    def predict_loads(self, features):
        """Predict future load for each server using simple heuristics"""
        current_loads = features.get('current_loads', [0, 0, 0, 0])
        request_rate = features.get('request_rate', 0)
        time_of_day = features.get('time_of_day', 12)
        
        predictions = []
        for i, current_load in enumerate(current_loads):
            # Simulate prediction: 
            # - Higher request rate increases load
            # - Time patterns (peak hours: 9-17)
            # - Server D (index 3) has degraded performance
            time_factor = 1.2 if 9 <= time_of_day <= 17 else 0.8
            server_factor = 1.3 if i == 3 else 1.0  # Server D is slower
            
            predicted = current_load + (request_rate * 0.1) * time_factor * server_factor
            predicted = max(0, min(100, predicted))
            predictions.append(predicted)
        
        return predictions
    
    def recommend_server(self, predictions, active_servers):
        """Recommend server with lowest predicted load"""
        valid_predictions = [(i+1, pred) for i, pred in enumerate(predictions) if (i+1) in active_servers]
        if not valid_predictions:
            return 1
        return min(valid_predictions, key=lambda x: x[1])[0]

# Initialize AI model
ai_balancer = AILoadBalancer()

@app.route('/predict', methods=['POST'])
def predict():
    """AI-powered load balancing prediction endpoint"""
    try:
        data = request.json
        
        # Extract features
        current_loads = data.get('current_loads', [0, 0, 0, 0])
        request_rate = data.get('request_rate', 50)
        time_of_day = data.get('time_of_day', datetime.now().hour)
        active_servers = data.get('active_servers', [1, 2, 3, 4])
        
        features = {
            'current_loads': current_loads,
            'request_rate': request_rate,
            'time_of_day': time_of_day
        }
        
        # Get predictions
        predictions = ai_balancer.predict_loads(features)
        
        # Recommend best server
        recommended_server = ai_balancer.recommend_server(predictions, active_servers)
        
        # Calculate confidence based on load balance spread
        min_pred = min(predictions)
        max_pred = max(predictions)
        confidence = 0.7 + (0.25 * (1 - (max_pred - min_pred) / 100))  # Higher confidence if loads are balanced
        
        # Generate reasoning
        reasoning = f"Server {recommended_server} selected: predicted load {predictions[recommended_server-1]:.1f}% (lowest among active)"
        
        response = {
            'recommended_server': recommended_server,
            'predictions': [round(p, 1) for p in predictions],
            'confidence': round(confidence, 3),
            'reasoning': reasoning
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"⚠ Error in prediction: {e}")
        return jsonify({
            'recommended_server': 1,
            'predictions': [25.0, 25.0, 25.0, 25.0],
            'confidence': 0.5,
            'reasoning': 'Fallback: Server 1 selected due to prediction error'
        }), 200  # Return 200 to not crash the load balancer

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'AI Load Balancer'})

if __name__ == '__main__':
    print("🚀 Starting AI Service on http://localhost:5000")
    print("📊 Endpoints: /predict (POST), /health (GET)\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
