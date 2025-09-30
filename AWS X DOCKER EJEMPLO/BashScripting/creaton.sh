#!/bin/bash
# Script para compilar y cargar módulos del kernel (RAM, CPU, PROCESOS)

# Rutas base
BASE_DIR="$(pwd)/Modulos_Kernel"
# MODULO_PROCESOS_DIR="/home/emilio/Escritorio/Github/SO1_202200314/Proyecto2_Fase2/Modulo"  # No aplica en este proyecto

# Archivos de módulos
MODULOS=("ram" "cpu")

echo " -----Iniciando instalación de módulos del Kernel---- "

# RAM y CPU
for modulo in "${MODULOS[@]}"; do
    MODULO_DIR="$BASE_DIR/$modulo"
    KO_FILE="${modulo}_202200314.ko"

    echo " --> Entrando a: $MODULO_DIR"
    cd "$MODULO_DIR" || { echo " No se pudo acceder a $MODULO_DIR"; exit 1; }

    echo " --> Compilando módulo $modulo..."
    make clean && make

    if [ -f "$KO_FILE" ]; then
        echo " --> Cargando módulo en el kernel: $KO_FILE"
        sudo insmod "$KO_FILE"

        echo " --> Verificando en /proc/${modulo}_202200314"
        if [ -f "/proc/${modulo}_202200314" ]; then
            echo " --> Módulo $modulo cargado correctamente:"
            cat "/proc/${modulo}_202200314"
        else
            echo " Error --> No se encontro /proc/${modulo}_202200314"
        fi
    else
        echo " Error --> No se genero el archivo $KO_FILE"
    fi

    echo "---------------------------------------------"
done

# Procesos
# echo " --> Procesando módulo de procesos"
# cd "$MODULO_PROCESOS_DIR" || { echo " No se pudo acceder a $MODULO_PROCESOS_DIR"; exit 1; }

# echo " --> Compilando módulo procesos..."
# make clean && make

# if [ -f "procesos_202200314.ko" ]; then
#     echo " --> Cargando módulo en el kernel: procesos_202200314.ko"
#     sudo insmod procesos_202200314.ko

#     echo " --> Verificando en /proc/procesos_202200314"
#     if [ -f "/proc/procesos_202200314" ]; then
#         echo " --> Módulo procesos cargado correctamente:"
#         cat /proc/procesos_202200314
#     else
#         echo " Error --> No se encontro /proc/procesos_202200314"
#     fi
# else
#     echo " Error --> No se genero procesos_202200314.ko"
# fi

# echo "---------------------------------------------"
echo " Todos los modulos han sido procesados."



