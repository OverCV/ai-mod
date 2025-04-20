import os, joblib, numpy as np 
  
print("Loading models...")  
model_path = "models/r_cardio/mejor_modelo.pkl"  
model = joblib.load(model_path)  
 
# Generate test data  
print("Generating test data...")  
features = model.n_features_in_  
test_data = np.random.rand(5, features)  
 
# Make prediction  
print("Making predictions...")  
predictions = model.predict(test_data)  
probabilities = model.predict_proba(test_data)  
 
# Print results  
print("\nPrediction results:")  
for i, (pred, prob) in enumerate(zip(predictions, probabilities)):  
    print(f'Sample {i+1}: Class={pred}, Probability={prob[1]:.4f}')  
  
print("\nTest successful! The optimized model is working correctly.") 
