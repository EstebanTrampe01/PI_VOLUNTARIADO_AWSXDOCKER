package filemanag

import (
	"Backend/DiskManagement"
	"Backend/UserManagement"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

type FileSystemItem struct {
	Name        string `json:"name"`
	Type        string `json:"type"` 
	Size        string `json:"size"`
	Modified    string `json:"modified"`
	Permissions string `json:"permissions"`
	Owner       string `json:"owner"`
	Group       string `json:"group"`
	OwnerUID    string `json:"owner_uid"`
	GroupGID    string `json:"group_gid"`
	FullPath    string `json:"full_path"`
}

func GetAllFiles(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	partitionID := vars["partitionId"]

	if partitionID == "" {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]FileSystemItem{})
		return
	}

	if !UserManagement.IsLoggedIn() {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]FileSystemItem{})
		return
	}

	// PARA QUE SOLO SE VEA EL CONTENIDO DE LA PARTICIÓN DE LA SESIÓN ACTIVA
	// if UserManagement.CurrentSession.PartitionID != partitionID {
	//     return array_vacío;
	// }

	// COMO NO HAY RESTRICCIÓN DE VISTA PARA EL ID DE LA PARTICIÓN QUE SE INGRESA SE PUEDE VER EL DE LOS DEMÁS
	if !isPartitionMountedAndFormatted(partitionID) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]FileSystemItem{})
		return
	}

	files, err := getFilesFromAnyPartition(partitionID, r.URL.Query().Get("path"))
	if err != nil {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]FileSystemItem{})
		return
	}

	if files == nil {
		files = []FileSystemItem{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(files)
}

func isPartitionMountedAndFormatted(partitionID string) bool {
	mountedPartitions := DiskManagement.GetMountedPartitions()

	for _, partitions := range mountedPartitions {
		for _, part := range partitions {
			cleanID := strings.Trim(string(part.ID), "\x00")
			if cleanID == partitionID {
				if part.Status == '1' {
					return true
				} else {
					return false
				}
			}
		}
	}

	return false
}

func getFilesFromAnyPartition(partitionID, path string) ([]FileSystemItem, error) {
	if path == "" {
		path = "/"
	}

	originalSession := UserManagement.CurrentSession

	UserManagement.CurrentSession.PartitionID = partitionID

	files, err := GetFilesFromDirectory(path)

	UserManagement.CurrentSession = originalSession


	return files, err
}

func GetFileContent(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	partitionID := vars["partitionId"]
	filePath := r.URL.Query().Get("path")

	if partitionID == "" || filePath == "" {
		http.Error(w, "Partición y path requeridos", http.StatusBadRequest)
		return
	}

	if !UserManagement.IsLoggedIn() {
		http.Error(w, "Se requiere sesión activa", http.StatusUnauthorized)
		return
	}

	if !isPartitionMountedAndFormatted(partitionID) {
		http.Error(w, fmt.Sprintf("Partición %s no está montada o formateada", partitionID), http.StatusBadRequest)
		return
	}

	content, err := getFileContentFromAnyPartition(partitionID, filePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error leyendo archivo: %v", err), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"content":   content,
		"path":      filePath,
		"partition": partitionID,
		"read_by":   UserManagement.CurrentSession.Username,
		"mode":      "universal_explorer",
	}

	json.NewEncoder(w).Encode(response)
}

func getFileContentFromAnyPartition(partitionID, filePath string) (string, error) {

	originalSession := UserManagement.CurrentSession

	UserManagement.CurrentSession.PartitionID = partitionID

	isFile, err := VerifyIsFile(filePath)
	if err != nil {
		UserManagement.CurrentSession = originalSession
		return "", err
	}

	if !isFile {
		UserManagement.CurrentSession = originalSession
		return "", fmt.Errorf("'%s' es un directorio, no un archivo", filePath)
	}

	content, err := GetFileContentDirect(filePath)

	UserManagement.CurrentSession = originalSession

	return content, err
}
