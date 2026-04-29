"""
AI Prediction Service — CS3009 Software Engineering Project
Uses scikit-learn RandomForestRegressor for server load prediction.
Falls back to heuristic model if sklearn is unavailable.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import random
from datetime import datetime
import numpy as np

app = Flask(__name__)
CORS(app)

# ── Scikit-learn Model ────────────────────────────────────────────────────────
try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.preprocessing import StandardScaler
    import pickle, os

    class SklearnLoadPredictor:
        """
        RandomForestRegressor-based load predictor.
        Features per server: [current_load, request_rate, time_of_day, server_index]
        Target: predicted_load (next interval)
        """
        def __init__(self):
            self.models = []       # one model per server (4 total)
            self.scalers = []
            self._train_models()

        def _generate_training_data(self, server_idx):
            """
            Generate synthetic training data that mimics real server behavior:
            - Server D (idx 3) has higher baseline load (slower server)
            - Peak hours (9–17) increase load
            - Request rate linearly increases load
            """
            n = 2000
            current_loads   = np.random.uniform(0, 90, n)
            request_rates   = np.random.uniform(0, 20, n)
            times_of_day    = np.random.uniform(0, 23, n)
            noise           = np.random.normal(0, 3, n)

            # Time factor: peak hours
            time_factor = np.where((times_of_day >= 9) & (times_of_day <= 17), 1.25, 0.85)
            # Server D is intentionally slower / higher load factor
            server_factor = 1.35 if server_idx == 3 else 1.0

            predicted = (
                current_loads * 0.65                          # load persistence
                + request_rates * 1.8 * time_factor          # request pressure
                * server_factor
                + noise
            )
            predicted = np.clip(predicted, 0, 100)

            X = np.column_stack([current_loads, request_rates, times_of_day, np.full(n, server_idx)])
            return X, predicted

        def _train_models(self):
            """Train one RandomForestRegressor per server."""
            for i in range(4):
                X, y = self._generate_training_data(i)
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X)
                model = RandomForestRegressor(
                    n_estimators=80,
                    max_depth=8,
                    random_state=42,
                    n_jobs=-1
                )
                model.fit(X_scaled, y)
                self.models.append(model)
                self.scalers.append(scaler)
            print("✓ scikit-learn RandomForestRegressor models trained for 4 servers")

        def predict_loads(self, features):
            """Predict next-interval load for each server."""
            current_loads = features.get('current_loads', [0, 0, 0, 0])
            request_rate  = features.get('request_rate', 0)
            time_of_day   = features.get('time_of_day', datetime.now().hour)

            predictions = []
            for i, current_load in enumerate(current_loads):
                X = np.array([[current_load, request_rate, time_of_day, i]])
                X_scaled = self.scalers[i].transform(X)
                pred = self.models[i].predict(X_scaled)[0]
                predictions.append(float(np.clip(pred, 0, 100)))
            return predictions

        def recommend_server(self, predictions, active_servers):
            """Choose server with lowest predicted load among active ones."""
            valid = [(i + 1, p) for i, p in enumerate(predictions) if (i + 1) in active_servers]
            if not valid:
                return 1
            return min(valid, key=lambda x: x[1])[0]

    predictor = SklearnLoadPredictor()
    USE_SKLEARN = True

except ImportError:
    USE_SKLEARN = False
    print("⚠ scikit-learn not available — using heuristic fallback")

    class HeuristicPredictor:
        """Simple heuristic model (fallback when sklearn is absent)."""
        def predict_loads(self, features):
            current_loads = features.get('current_loads', [0, 0, 0, 0])
            request_rate  = features.get('request_rate', 0)
            time_of_day   = features.get('time_of_day', 12)
            time_factor   = 1.2 if 9 <= time_of_day <= 17 else 0.8
            predictions   = []
            for i, load in enumerate(current_loads):
                server_factor = 1.3 if i == 3 else 1.0
                pred = load + (request_rate * 0.1) * time_factor * server_factor
                predictions.append(float(max(0, min(100, pred))))
            return predictions

        def recommend_server(self, predictions, active_servers):
            valid = [(i + 1, p) for i, p in enumerate(predictions) if (i + 1) in active_servers]
            return min(valid, key=lambda x: x[1])[0] if valid else 1

    predictor = HeuristicPredictor()


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    """AI-powered load balancing prediction endpoint."""
    try:
        data           = request.json or {}
        current_loads  = data.get('current_loads', [0, 0, 0, 0])
        request_rate   = data.get('request_rate', 0)
        time_of_day    = data.get('time_of_day', datetime.now().hour)
        active_servers = data.get('active_servers', [1, 2, 3, 4])

        features = {
            'current_loads': current_loads,
            'request_rate':  request_rate,
            'time_of_day':   time_of_day,
        }

        predictions        = predictor.predict_loads(features)
        recommended_server = predictor.recommend_server(predictions, active_servers)

        # Confidence: higher spread → lower confidence (loads are unbalanced → easier to decide)
        min_pred   = min(predictions)
        max_pred   = max(predictions)
        spread     = max_pred - min_pred
        confidence = float(np.clip(0.70 + 0.25 * (1 - spread / 100), 0.55, 0.98)) if USE_SKLEARN else \
                     float(0.70 + 0.25 * (1 - spread / 100))

        # Reasoning string
        srv_name  = ['A', 'B', 'C', 'D'][recommended_server - 1]
        pred_load = predictions[recommended_server - 1]
        model_tag = 'RandomForest ML' if USE_SKLEARN else 'Heuristic'
        reasoning = (
            f"[{model_tag}] Server {recommended_server} ({srv_name}) selected — "
            f"predicted load {pred_load:.1f}% (lowest among active servers). "
            f"Spread across servers: {spread:.1f}%."
        )

        return jsonify({
            'recommended_server': recommended_server,
            'predictions':        [round(p, 1) for p in predictions],
            'confidence':         round(confidence, 3),
            'reasoning':          reasoning,
            'model':              'sklearn-random-forest' if USE_SKLEARN else 'heuristic',
        })

    except Exception as e:
        print(f"⚠ Prediction error: {e}")
        return jsonify({
            'recommended_server': 1,
            'predictions':        [25.0, 25.0, 25.0, 25.0],
            'confidence':         0.50,
            'reasoning':          'Fallback: prediction error — defaulting to Server 1',
            'model':              'fallback',
        }), 200


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':  'healthy',
        'service': 'AI Load Balancer',
        'model':   'sklearn-random-forest' if USE_SKLEARN else 'heuristic',
    })


if __name__ == '__main__':
    print("🚀 Starting AI Service on http://localhost:5000")
    print("📊 Endpoints: /predict (POST), /health (GET)\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
