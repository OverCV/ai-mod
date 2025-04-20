import os, joblib  
  
original_model = "models/r_cardio/rf_cardio_model.pkl"  
optimized_model = "models/r_cardio/rf_cardio_model_optimizado.pkl"  
  
original_size = os.path.getsize(original_model) / (1024 * 1024)  
optimized_size = os.path.getsize(optimized_model) / (1024 * 1024)  
  
print(f"Original model size: {original_size:.2f} MB")  
print(f"Optimized model size: {optimized_size:.2f} MB")  
print(f"Size reduction: {(1 - optimized_size/original_size) * 100:.1f}%") 
