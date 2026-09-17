#!/bin/bash

# Instalación de dependencias
echo "Instalando dependencias..."
npm install

# Establecer configuración del entorno
echo "Configurando entorno..."
cp .env.example .env.local

# Mensaje de éxito
echo "✅ Configuración completada. Ejecuta 'npm run dev' para iniciar la aplicación."
echo "🔗 Después de iniciar la aplicación, accede a http://localhost:3000/todo-page" 