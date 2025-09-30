#include <stdio.h>
#include <stdbool.h>
#include <pthread.h>


volatile bool interesado[2] = {false, false};//Esta parte es la variable de interés para los procesos
volatile int turno = 0;// Esta parte es la variable de turno para los procesos

void* proceso(void* arg) {// Creo esta función para simular los procesos que entran a la sección crítica
    int id = *(int*)arg;
    int otro = 1 - id;

    for (int i = 0; i < 5; i++) {
        interesado[id] = true;
        turno = otro;

        while (interesado[otro] && turno == otro); // espera activa

        // Sección crítica
        printf("Proceso %d en sección crítica\n", id);

        interesado[id] = false;
    }
    return NULL;
}

int main() {
    pthread_t hilos[2];// Creo dos hilos para simular los procesos
    int ids[2] = {0, 1};// Identificadores de los procesos

    pthread_create(&hilos[0], NULL, proceso, &ids[0]);
    pthread_create(&hilos[1], NULL, proceso, &ids[1]);

    pthread_join(hilos[0], NULL);
    pthread_join(hilos[1], NULL);
    printf("Todos los procesos han terminado.\n");
    // Verificación de la exclusión mutua
    for (int i = 0; i < 2; i++) {
        if (interesado[i]) {
            printf("Proceso %d aún está interesado en la sección crítica.\n", i);
        }
    }

    return 0;
}

