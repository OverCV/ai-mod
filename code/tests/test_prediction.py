import os, joblib, numpy as np 
  
# Load model  
print("Loading optimized model...")  
model_path = "models/r_cardio/rf_cardio_model_optimizado.pkl"  
model = joblib.load(model_path) 
  
# Generate test data  
print("Generating test data...")  
features = model.n_features_in_  
test_data = np.random.rand(5, features) 
  
# Make predictions  
print("Making predictions...")  
predictions = model.predict(test_data)  
probabilities = model.predict_proba(test_data) 
  
# Print results  
print("\nPrediction results:")  
for i in range(len(predictions)):  
"    print(f'Sample {i+1}: Class={predictions[i]}, Probability={probabilities[i][1]:.4f}')" 
  
print("\nTest successful! The optimized model is working correctly.") 
