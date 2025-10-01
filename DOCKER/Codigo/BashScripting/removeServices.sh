#!/bin/bash

echo " ----------Limpiando todos los servicios utilizados---------"

# 1. Detener y eliminar contenedores relacionados al proyecto
echo " Eliminando contenedores de Docker: - - - - -"
sudo docker ps -a --filter "name=proyecto1_fase1" --format "{{.ID}}" | xargs -r sudo docker rm -f
sudo docker ps -a --filter "name=db" --format "{{.ID}}" | xargs -r sudo docker rm -f

# 2. Eliminar imágenes relacionadas al proyecto
echo " Eliminando imágenes: ...."
sudo docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "proyecto1_fase1|mongo|nginx|alpine|hello-world|containerstack" | xargs -r sudo docker rmi -f

# 3. Eliminar volúmenes
echo " Eliminando volúmenes:..."
sudo docker volume rm mongo_data 2>/dev/null

# 4. Eliminar módulos del kernel 
for mod in ram_202200314 cpu_202200314; do
    if lsmod | grep -q "$mod"; then
        echo "Elimiando módulo del kernel: $mod"
        sudo rmmod "$mod"
    else
        echo " Error --> Módulo $mod no está cargado"
    fi
done

echo " Limpieza completada"
