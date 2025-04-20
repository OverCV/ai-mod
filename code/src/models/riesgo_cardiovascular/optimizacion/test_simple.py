# Test script for comparing models 
import joblib, numpy as np, os 
  
# Paths  
original_model = "models/r_cardio/rf_cardio_model.pkl"  
optimized_model = "models/r_cardio/rf_cardio_model_optimizado.pkl" 
  
# Check sizes  
original_size = os.path.getsize(original_model) / (1024 * 1024)  
optimized_size = os.path.getsize(optimized_model) / (1024 * 1024) 
  
print(f"Original model size: {original_size:.2f} MB")  
print(f"Optimized model size: {optimized_size:.2f} MB")  
print(f"Size reduction: {(1 - optimized_size/original_size) * 100:.1f}%") 
  
# Load models  
print("\nLoading models...")  
model_orig = joblib.load(original_model)  
model_opt = joblib.load(optimized_model) 
  
# Generate test data  
nfeatures = model_orig.n_features_in_  
print(f"\nGenerating test data with {nfeatures} features...")  
X_test = np.random.rand(1000, nfeatures) 
  
# Make predictions  
print("\nMaking predictions...")  
y_pred_orig = model_orig.predict(X_test)  
y_pred_opt = model_opt.predict(X_test) 
  
# Compare predictions  
agreement = np.mean(y_pred_orig == y_pred_opt) * 100  
print(f"\nPrediction agreement: {agreement:.2f}%")  
print(f"Models make the same predictions for {agreement:.2f}% of test cases") 
  
if agreement > 95:  
    print("\nTest PASSED: The optimized model is working correctly!")  
else:  
    print("\nTest FAILED: Models give different predictions") 
