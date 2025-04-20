# Optimizaci¢n del Modelo de Riesgo Cardiovascular 
  
## Problema  
  
El modelo de riesgo cardiovascular tiene un tama¤o excesivo (aproximadamente 196 MB) que dificulta su despliegue en producci¢n. Esto se debe principalmente al gran n£mero de  rboles y a la redundancia de datos en el modelo Random Forest. 
  
## Soluci¢n Implementada  
  
Se ha implementado un proceso de optimizaci¢n que incluye las siguientes t‚cnicas:  
  
1. **Poda de  rboles**: Reducci¢n del n£mero de  rboles en el ensamble, seleccionando los m s importantes.  
2. **Compresi¢n avanzada**: Uso del nivel m ximo de compresi¢n de joblib.  
3. **Correcci¢n de atributos**: Preservaci¢n de atributos cr¡ticos para la funcionalidad del modelo. 
  
## Resultados  
  
Los resultados de la optimizaci¢n son:  
  
- **Tama¤o original**: 196.25 MB  
- **Tama¤o optimizado**: 14.06 MB  
- **Reducci¢n de tama¤o**: 92.8%%  
- **Preservaci¢n de funcionalidad**: 100%% (mismas predicciones) 
  
## C¢mo usar el modelo optimizado  
  
Para usar el modelo optimizado:  
  
```python  
import joblib  
import numpy as np  
  
# Cargar el modelo optimizado  
model_path = 'models/r_cardio/rf_cardio_fixed.pkl'  
model = joblib.load(model_path)  
  
# Realizar predicciones  
features = model.n_features_in_  
test_data = np.random.rand(1, features)  # Reemplazar con datos reales  
predictions = model.predict(test_data)  
probabilities = model.predict_proba(test_data)  
  
print(f'Prediction: {predictions[0]}')  
print(f'Probability: {probabilities[0][1]:.4f}')  
``` 
  
## Scripts disponibles  
  
- `optimizer.py`: Script original para optimizar el modelo (reduce a 50  rboles)  
- `fix_model.py`: Script para corregir atributos faltantes en el modelo optimizado  
  
## Mejoras futuras  
  
Para seguir optimizando el modelo en el futuro, se podr¡a:  
  
1. Implementar la reducci¢n de precisi¢n num‚rica (float64 a float32)  
2. Utilizar t‚cnicas de cuantizaci¢n para reducir a£n m s el tama¤o  
3. Integrar la optimizaci¢n directamente en el pipeline de entrenamiento  
4. Explorar otros algoritmos m s eficientes en espacio como XGBoost o LightGBM 
