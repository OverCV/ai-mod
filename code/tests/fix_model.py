# Script para corregir el modelo optimizado 
  
import joblib  
import os  
 
print("Loading models...")  
original_path = 'models/r_cardio/rf_cardio_model.pkl'  
optimized_path = 'models/r_cardio/rf_cardio_model_optimizado.pkl'  
fixed_path = 'models/r_cardio/rf_cardio_fixed.pkl'  
 
original = joblib.load(original_path)  
optimized = joblib.load(optimized_path)  
 
print("Original model attributes:")  
print("- n_outputs_:", hasattr(original, 'n_outputs_'))  
print("- value:", getattr(original, 'n_outputs_', 'N/A'))  
 
print("\nOptimized model attributes:")  
print("- n_outputs_:", hasattr(optimized, 'n_outputs_'))  
 
print("\nFixing model...")  
optimized.n_outputs_ = original.n_outputs_  
 
print("- n_outputs_ after fix:", hasattr(optimized, 'n_outputs_'))  
print("- value:", optimized.n_outputs_)  
 
print("\nSaving fixed model...")  
joblib.dump(optimized, fixed_path, compress=9)  
 
print("\nVerifying saved file:")  
print("- File exists:", os.path.exists(fixed_path))  
print("- File size: {:.2f} MB".format(os.path.getsize(fixed_path) / (1024 * 1024)))  
 
print("\nDone!") 
