#!/bin/bash

# Ruta del proyecto donde está el docker-compose.yml

POYECT_DIR="./DOCKER"

# Cambiar al directorio del proyecto
cd "$PROJECT_DIR" || { echo "Error --> No se pudo acceder a $PROJECT_DIR"; exit 1; }

# Ejecutar docker compose
sudo docker compose up --build