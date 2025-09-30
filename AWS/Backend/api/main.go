package main

import (
	"Backend/DiskManagement"
	"Backend/UserManagement"
	"Backend/Utils"
	"Backend/api/handlers"
	"Backend/api/handlers/disk"
	"Backend/api/handlers/filemanag"
	"Backend/api/handlers/usermanag"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {

	// 📁 CONFIGURACIÓN DINÁMICA DE DIRECTORIOS PARA AWS
	// Usa la función que creamos para obtener la ruta correcta de discos
	diskDir := Utils.GetDiskDirectory() // 🎯 Aquí usamos nuestra función!

	// 🔧 Crea el directorio si no existe (importante para AWS EC2)
	if err := os.MkdirAll(diskDir, 0755); err != nil {
		log.Printf("Advertencia: No se pudo crear directorio %s: %v", diskDir, err)
	}

	router := mux.NewRouter()

	// 🌐 CONFIGURACIÓN CORS PARA AWS S3 + EC2 COMMUNICATION
	// Esto permite que tu frontend en S3 haga peticiones a tu backend en EC2
	c := cors.New(cors.Options{
		AllowedOrigins: []string{
			// 🖥️ Para desarrollo local
			"http://localhost:5173", // Vite dev server
			"http://localhost:3000", // Create React App

			// ☁️ Para producción en AWS
			"https://*.s3.amazonaws.com",                   // S3 buckets
			"https://*.s3-website-us-east-2.amazonaws.com", // S3 website hosting
			"https://*.amazonaws.com",                      // Cualquier dominio AWS
			"*",                                            // 🚨 Permite todo (solo para desarrollo)
		},
		// 📡 Métodos HTTP permitidos desde el frontend
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		// 📋 Headers permitidos en las peticiones
		AllowedHeaders: []string{"*"},
		// 🔒 Sin credenciales (cookies, auth headers)
		AllowCredentials: false,
	})

	router.HandleFunc("/api/health", healthCheck).Methods("GET")
	router.HandleFunc("/api/system-status", getSystemStatus).Methods("GET")

	router.HandleFunc("/api/execute-command", handlers.ExecuteCommand).Methods("POST")
	router.HandleFunc("/api/streaming-batch", handlers.StreamingBatchExecute).Methods("POST")

	router.HandleFunc("/api/login", usermanag.HandleLogin).Methods("POST")
	router.HandleFunc("/api/logout", usermanag.HandleLogout).Methods("POST")
	router.HandleFunc("/api/session", usermanag.GetCurrentSession).Methods("GET")

	router.HandleFunc("/api/users/{partitionId}", usermanag.GetAllUsers).Methods("GET")
	router.HandleFunc("/api/groups/{partitionId}", usermanag.GetAllGroups).Methods("GET")
	router.HandleFunc("/api/partition-info", usermanag.GetPartitionUserInfo).Methods("GET")
	router.HandleFunc("/api/validate-partition/{partitionId}", usermanag.ValidatePartitionForUsers).Methods("GET")

	router.HandleFunc("/api/disks", disk.GetAllDisks).Methods("GET")
	router.HandleFunc("/api/partitions/{diskId}", disk.GetAllPartitions).Methods("GET")

	router.HandleFunc("/api/disk-details/{diskId}", getDiskDetails).Methods("GET")
	router.HandleFunc("/api/partition-details/{partitionId}", getPartitionDetails).Methods("GET")

	router.HandleFunc("/api/filesystem/{partitionId}", filemanag.GetAllFiles).Methods("GET")
	router.HandleFunc("/api/file-content/{partitionId}", filemanag.GetFileContent).Methods("GET")

	router.HandleFunc("/api/global-scan", filemanag.GetGlobalScan).Methods("GET")
	router.HandleFunc("/api/explorable-partitions", filemanag.GetAllExplorablePartitions).Methods("GET")

	router.HandleFunc("/api/mounted-partitions", getMountedPartitions).Methods("GET")
	router.HandleFunc("/api/debug/users/{partitionId}", usermanag.GetUsersForDebug).Methods("GET")

	handler := c.Handler(router)

	initializeCommandSystem()

	// 🌐 CONFIGURACIÓN DINÁMICA DE PUERTO PARA AWS
	// Lee variable de entorno PORT (configurada en AWS EC2)
	port := os.Getenv("PORT")

	// 🖥️ Si no existe la variable (desarrollo local), usa puerto por defecto
	if port == "" {
		port = "8080" // Puerto para desarrollo y AWS por defecto
	}

	// 🔧 Agrega ":" al inicio para formato correcto
	port = ":" + port

	fmt.Printf("Servidor API ejecutándose en http://localhost%s\n", port)
	fmt.Println("🌐 CORS habilitado para S3 ↔ EC2 communication")

	// 🚀 INICIA EL SERVIDOR EN TODAS LAS INTERFACES (0.0.0.0)
	// Esto permite que AWS EC2 reciba peticiones externas desde S3
	log.Fatal(http.ListenAndServe(port, handler))
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	mountedCount := 0
	for _, partitions := range DiskManagement.GetMountedPartitions() {
		mountedCount += len(partitions)
	}

	response := map[string]interface{}{
		"status":             "OK",
		"message":            "Backend funcionando correctamente",
		"version":            "2.0.0-modularized",
		"mounted_partitions": mountedCount,
		"session_active":     UserManagement.IsLoggedIn(),
		"modules_loaded":     []string{"disk", "filemanag", "usermanag"},
		"legacy_deprecated":  true,
	}

	if UserManagement.IsLoggedIn() {
		response["current_user"] = UserManagement.CurrentSession.Username
		response["partition_id"] = UserManagement.CurrentSession.PartitionID
		response["is_root"] = UserManagement.CurrentSession.IsRoot
	}

	json.NewEncoder(w).Encode(response)
}

func getSystemStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	mountedPartitions := DiskManagement.GetMountedPartitions()

	diskCount := len(mountedPartitions)

	totalPartitions := 0
	for _, partitions := range mountedPartitions {
		totalPartitions += len(partitions)
	}

	diskDetails := make(map[string]interface{})
	for diskID, partitions := range mountedPartitions {
		diskDetails[diskID] = map[string]interface{}{
			"partition_count": len(partitions),
			"partitions":      partitions,
		}
	}

	response := map[string]interface{}{
		"api_version":          "2.0.0-modularized",
		"modules_active":       []string{"disk", "filemanag", "usermanag"},
		"legacy_handlers":      "deprecated",
		"total_disks":          diskCount,
		"total_partitions":     totalPartitions,
		"session_active":       UserManagement.IsLoggedIn(),
		"disk_details":         diskDetails,
		"system_ready":         true,
		"aws_deployment_ready": true,
	}

	if UserManagement.IsLoggedIn() {
		response["current_session"] = map[string]interface{}{
			"username":     UserManagement.CurrentSession.Username,
			"partition_id": UserManagement.CurrentSession.PartitionID,
			"group":        UserManagement.CurrentSession.Group,
			"is_root":      UserManagement.CurrentSession.IsRoot,
			"uid":          UserManagement.CurrentSession.UID,
			"gid":          UserManagement.CurrentSession.GID,
		}
	}

	json.NewEncoder(w).Encode(response)
}

func getMountedPartitions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	mountedPartitions := DiskManagement.GetMountedPartitions()

	response := map[string]interface{}{
		"mounted_partitions": mountedPartitions,
		"total_disks":        len(mountedPartitions),
	}

	totalPartitions := 0
	loggedInPartitions := 0

	for _, partitions := range mountedPartitions {
		totalPartitions += len(partitions)
		for _, p := range partitions {
			if p.LoggedIn {
				loggedInPartitions++
			}
		}
	}

	response["total_partitions"] = totalPartitions
	response["logged_in_partitions"] = loggedInPartitions

	json.NewEncoder(w).Encode(response)
}

func getDiskDetails(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	diskID := vars["diskId"]

	w.Header().Set("Content-Type", "application/json")

	diskInfo, err := disk.GetDiskDetails(diskID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(diskInfo)
}

func getPartitionDetails(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	partitionID := vars["partitionId"]

	w.Header().Set("Content-Type", "application/json")

	partitionInfo, err := disk.GetPartitionDetails(partitionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(partitionInfo)
}

func initializeCommandSystem() {

	mounted := DiskManagement.GetMountedPartitions()
	if len(mounted) > 0 {
		fmt.Printf("Discos con particiones montadas: %d\n", len(mounted))
		for diskID, partitions := range mounted {
			fmt.Printf(" Disco %s: %d particiones\n", diskID, len(partitions))
		}
	} else {
		fmt.Println("No hay particiones montadas")
	}
}
