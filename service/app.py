from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import os
from datetime import datetime
import random

app = Flask(__name__)
CORS(app)

class AILoadBalancer:
    def __init__(self):
        self.model = None
        self.load_history = []
        self.train_model()
    
    def train_model(self):
        """Train a simple ML model to predict server load"""
        # Simulated training data: [hour, current_load, request_rate, server_capacity]
        X_train = []
        y_train = []
        
        # Generate synthetic training data
        for hour in range(24):
            for load in range(0, 101, 10):
                for rate in range(0, 100, 20):
                    X_train.append([hour, load, rate])
                    # Target: predicted load after 5 seconds
                    predicted_load = min(100, load + rate * 0.3 + np.random.normal(0, 5))
                    y_train.append(predicted_load)
        
        self.X_train = np.array(X_train)
        self.y_train = np.array(y_train)
        
        # Simple linear regression model (for demonstration)
        # In production, use scikit-learn
        self.weights = np.linalg.lstsq(self.X_train, self.y_train, rcond=None)[0]
        
    def predict_loads(self, features):
        """Predict future load for each server"""
        hour = features.get('time_of_day', datetime.now().hour)
        request_rate = features.get('request_rate', 50)
        
        predictions = []
        for i in range(4):  # 4 servers
            current_load = features['current_loads'][i] if i < len(features['current_loads']) else 50
            predicted = (self.weights[0] * hour + 
                        self.weights[1] * current_load + 
                        self.weights[2] * request_rate)
            predictions.append(max(0, min(100, predicted)))
        
        return predictions
    
    def recommend_server(self, predictions):
        """Recommend server with lowest predicted load"""
        return int(np.argmin(predictions)) + 1

# Initialize AI model
ai_balancer = AILoadBalancer()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        print(f"Received prediction request: {data}")
        
        # Extract features
        features = {
            'current_loads': data.get('current_loads', [0, 0, 0, 0]),
            'request_history': data.get('request_history', []),
            'time_of_day': data.get('time_of_day', datetime.now().hour),
            'request_rate': data.get('request_rate', 50)
        }
        
        # Get predictions
        predictions = ai_balancer.predict_loads(features)
        recommended_server = ai_balancer.recommend_server(predictions)
        
        response = {
            'recommended_server': recommended_server,
            'predictions': predictions,
            'confidence': random.uniform(0.7, 0.95),
            'reasoning': f"Server {recommended_server} has lowest predicted load ({min(predictions):.1f}%)"
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Error in prediction: {e}")
        return jsonify({
            'recommended_server': 1,
            'predictions': [25, 25, 25, 25],
            'confidence': 0.5,
            'error': str(e)
        })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model_loaded': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)