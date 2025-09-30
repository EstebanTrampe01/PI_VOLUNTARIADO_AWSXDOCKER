#!/bin/bash

# Ruta del proyecto donde está el docker-compose.yml

PROJECT_DIR="/home/dant/Escritorio/Proyecto1_Fase1"

# Cambiar al directorio del proyecto
cd "$PROJECT_DIR" || { echo "Error --> No se pudo acceder a $PROJECT_DIR"; exit 1; }

# Ejecutar docker compose
sudo docker compose up --build