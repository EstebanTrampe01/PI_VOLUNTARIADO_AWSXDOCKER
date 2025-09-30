package usermanag

import (
	"Backend/DiskManagement"
	"Backend/UserManagement"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

type SessionInfo struct {
	Username    string `json:"username"`
	UID         int    `json:"uid"`
	GID         int    `json:"gid"`
	PartitionID string `json:"partitionId"`
	IsActive    bool   `json:"isActive"`
	IsRoot      bool   `json:"isRoot"`
	Group       string `json:"group"`
}

type UserInfo struct {
	UID      string `json:"uid"`
	Username string `json:"username"`
	Group    string `json:"group"`
	GID      string `json:"gid"`
	Status   string `json:"status"` 
}

type GroupInfo struct {
	GID    string `json:"gid"`
	Name   string `json:"name"`
	Status string `json:"status"` 
}

type LoginRequest struct {
	IDParticion string `json:"idParticion"`
	User        string `json:"user"`
	Password    string `json:"password"`
}

type LoginResponse struct {
	Success bool         `json:"success"`
	Message string       `json:"message"`
	Session *SessionInfo `json:"session,omitempty"`
	Error   string       `json:"error,omitempty"`
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "JSON inválido", http.StatusBadRequest)
		return
	}

	if req.IDParticion == "" || req.User == "" || req.Password == "" {
		response := LoginResponse{
			Success: false,
			Error:   "Todos los campos son requeridos",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	isValid, errorMsg := validatePartitionForLogin(req.IDParticion)
	if !isValid {
		response := LoginResponse{
			Success: false,
			Error:   errorMsg,
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	fmt.Printf("🔍 Intentando login: %s en partición %s\n", req.User, req.IDParticion)
	UserManagement.Login(req.User, req.Password, req.IDParticion)

	if UserManagement.IsLoggedIn() &&
		UserManagement.CurrentSession.Username == req.User &&
		UserManagement.CurrentSession.PartitionID == req.IDParticion {

		session := &SessionInfo{
			Username:    UserManagement.CurrentSession.Username,
			UID:         UserManagement.CurrentSession.UID,
			GID:         UserManagement.CurrentSession.GID,
			PartitionID: UserManagement.CurrentSession.PartitionID,
			IsActive:    true,
			IsRoot:      UserManagement.CurrentSession.IsRoot,
			Group:       UserManagement.CurrentSession.Group,
		}

		response := LoginResponse{
			Success: true,
			Message: fmt.Sprintf("Login exitoso en partición %s", req.IDParticion),
			Session: session,
		}

		fmt.Printf("login exitoso: %s en %s (UID=%d, GID=%d, Root=%t)\n",
			req.User, req.IDParticion, session.UID, session.GID, session.IsRoot)
		json.NewEncoder(w).Encode(response)
	} else {
		var errorDetail string
		if !UserManagement.IsLoggedIn() {
			errorDetail = "Usuario o contraseña incorrectos, o usuario no existe en esta partición"
		} else if UserManagement.CurrentSession.PartitionID != req.IDParticion {
			errorDetail = "Error interno: sesión establecida en partición incorrecta"
		} else {
			errorDetail = "Error interno: sesión no coincide con usuario solicitado"
		}

		response := LoginResponse{
			Success: false,
			Error:   "Credenciales incorrectas",
			Message: errorDetail,
		}

		fmt.Printf(" Login falló: %s en %s - %s\n", req.User, req.IDParticion, errorDetail)
		json.NewEncoder(w).Encode(response)
	}
}

func validatePartitionForLogin(partitionID string) (bool, string) {
	mountedPartitions := DiskManagement.GetMountedPartitions()

	found := false
	for _, partitions := range mountedPartitions {
		for _, part := range partitions {
			if strings.Trim(string(part.ID), "\x00") == partitionID {
				found = true
				break
			}
		}
		if found {
			break
		}
	}

	if !found {
		return false, fmt.Sprintf("La partición %s no está montada o no existe", partitionID)
	}

	fmt.Printf("Partición %s está montada y disponible para login\n", partitionID)
	return true, ""
}

func HandleLogout(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	if !UserManagement.IsLoggedIn() {
		response := map[string]interface{}{
			"success": false,
			"message": "No hay sesión activa",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	username := UserManagement.CurrentSession.Username

	UserManagement.Logout()

	response := map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Sesión cerrada para %s", username),
	}

	fmt.Printf(" Logout exitoso: %s\n", username)
	json.NewEncoder(w).Encode(response)
}

func GetCurrentSession(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if UserManagement.IsLoggedIn() {
		session := SessionInfo{
			Username:    UserManagement.CurrentSession.Username,
			UID:         UserManagement.CurrentSession.UID,
			GID:         UserManagement.CurrentSession.GID,
			PartitionID: UserManagement.CurrentSession.PartitionID,
			IsActive:    true,
			IsRoot:      UserManagement.CurrentSession.IsRoot,
			Group:       UserManagement.CurrentSession.Group,
		}

		response := map[string]interface{}{
			"success": true,
			"session": session,
		}
		json.NewEncoder(w).Encode(response)
	} else {
		response := map[string]interface{}{
			"success": false,
			"session": nil,
		}
		json.NewEncoder(w).Encode(response)
	}
}

func GetAllUsers(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	partitionID := vars["partitionId"]

	if partitionID == "" {
		http.Error(w, "ID de partición requerido", http.StatusBadRequest)
		return
	}

	users, err := getUsersFromPartition(partitionID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error obteniendo usuarios: %v", err), http.StatusInternalServerError)
		return
	}

	fmt.Printf("📋 Encontrados %d usuarios\n", len(users))
	json.NewEncoder(w).Encode(users)
}

func GetAllGroups(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	partitionID := vars["partitionId"]

	if partitionID == "" {
		http.Error(w, "ID de partición requerido", http.StatusBadRequest)
		return
	}

	groups, err := getGroupsFromPartition(partitionID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error obteniendo grupos: %v", err), http.StatusInternalServerError)
		return
	}

	fmt.Printf("📋 Encontrados %d grupos\n", len(groups))
	json.NewEncoder(w).Encode(groups)
}

func getUsersFromPartition(partitionID string) ([]UserInfo, error) {
	var users []UserInfo

	records, err := readUserRecordsFromPartition(partitionID)
	if err != nil {
		return nil, fmt.Errorf("error leyendo users.txt: %v", err)
	}

	for _, record := range records {
		if record.Type == "U" {
			status := "activo"
			if record.UID == "0" {
				status = "eliminado"
			}

			user := UserInfo{
				UID:      record.UID,
				Username: record.Username,
				Group:    record.Group,
				GID:      getGroupGID(record.Group, records),
				Status:   status,
			}

			users = append(users, user)
			fmt.Printf("  👤 Usuario: %s (UID=%s, Grupo=%s, Estado=%s)\n",
				user.Username, user.UID, user.Group, user.Status)
		}
	}

	return users, nil
}

func getGroupsFromPartition(partitionID string) ([]GroupInfo, error) {
	var groups []GroupInfo

	records, err := readUserRecordsFromPartition(partitionID)
	if err != nil {
		return nil, fmt.Errorf("error leyendo users.txt: %v", err)
	}

	for _, record := range records {
		if record.Type == "G" {
			status := "activo"
			if record.UID == "0" {  
				status = "eliminado"
			}

			group := GroupInfo{
				GID:    record.UID, 
				Name:   record.Group,
				Status: status,
			}

			groups = append(groups, group)
			fmt.Printf("  👥 Grupo: %s (GID=%s, Estado=%s)\n",
				group.Name, group.GID, group.Status)
		}
	}

	return groups, nil
}

func readUserRecordsFromPartition(partitionID string) ([]UserManagement.UserRecord, error) {

	if !UserManagement.IsLoggedIn() {
		return nil, fmt.Errorf("se requiere sesión activa para leer users.txt")
	}

	originalPartition := UserManagement.CurrentSession.PartitionID
	if originalPartition != partitionID {
		return nil, fmt.Errorf("sesión activa en partición diferente (%s vs %s)", originalPartition, partitionID)
	}

	partition, file, err := UserManagement.FindMountedPartitionForLoggedUser(partitionID)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	sb, err := UserManagement.ReadSuperblock(file, partition)
	if err != nil {
		return nil, err
	}

	records, err := UserManagement.ReadUserRecords(file, sb)
	if err != nil {
		return nil, err
	}

	return records, nil
}

func getGroupGID(groupName string, records []UserManagement.UserRecord) string {
	for _, record := range records {
		if record.Type == "G" && record.Group == groupName {
			return record.UID 
		}
	}
	return "0" 
}

func GetPartitionUserInfo(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	if !UserManagement.IsLoggedIn() {
		response := map[string]interface{}{
			"error":   "Se requiere login activo",
			"message": "Para ver usuarios, primero debe hacer login en una partición",
		}
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(response)
		return
	}

	users, err := getUsersFromCurrentSession()
	if err != nil {
		http.Error(w, fmt.Sprintf("Error obteniendo usuarios: %v", err), http.StatusInternalServerError)
		return
	}

	groups, err := getGroupsFromCurrentSession()
	if err != nil {
		http.Error(w, fmt.Sprintf("Error obteniendo grupos: %v", err), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"partition_id": UserManagement.CurrentSession.PartitionID,
		"session_user": UserManagement.CurrentSession.Username,
		"session_info": map[string]interface{}{
			"username": UserManagement.CurrentSession.Username,
			"uid":      UserManagement.CurrentSession.UID,
			"gid":      UserManagement.CurrentSession.GID,
			"group":    UserManagement.CurrentSession.Group,
			"is_root":  UserManagement.CurrentSession.IsRoot,
		},
		"total_users":  len(users),
		"total_groups": len(groups),
		"users":        users,
		"groups":       groups,
	}

	fmt.Printf("📋 Enviando info de partición %s: %d usuarios, %d grupos\n",
		UserManagement.CurrentSession.PartitionID, len(users), len(groups))
	json.NewEncoder(w).Encode(response)
}

func getUsersFromCurrentSession() ([]UserInfo, error) {
	if !UserManagement.IsLoggedIn() {
		return nil, fmt.Errorf("no hay sesión activa")
	}

	partition, file, err := UserManagement.FindMountedPartitionForLoggedUser(UserManagement.CurrentSession.PartitionID)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	sb, err := UserManagement.ReadSuperblock(file, partition)
	if err != nil {
		return nil, err
	}

	records, err := UserManagement.ReadUserRecords(file, sb)
	if err != nil {
		return nil, err
	}

	var users []UserInfo
	for _, record := range records {
		if record.Type == "U" {
			status := "activo"
			if record.UID == "0" {
				status = "eliminado"
			}

			user := UserInfo{
				UID:      record.UID,
				Username: record.Username,
				Group:    record.Group,
				GID:      getGroupGID(record.Group, records),
				Status:   status,
			}

			users = append(users, user)
			fmt.Printf("  Usuario encontrado: %s (UID=%s, Grupo=%s, Estado=%s)\n",
				user.Username, user.UID, user.Group, user.Status)
		}
	}

	return users, nil
}

func getGroupsFromCurrentSession() ([]GroupInfo, error) {
	if !UserManagement.IsLoggedIn() {
		return nil, fmt.Errorf("no hay sesión activa")
	}

	partition, file, err := UserManagement.FindMountedPartitionForLoggedUser(UserManagement.CurrentSession.PartitionID)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	sb, err := UserManagement.ReadSuperblock(file, partition)
	if err != nil {
		return nil, err
	}

	records, err := UserManagement.ReadUserRecords(file, sb)
	if err != nil {
		return nil, err
	}

	var groups []GroupInfo
	for _, record := range records {
		if record.Type == "G" {
			status := "activo"
			if record.UID == "0" {
				status = "eliminado"
			}

			group := GroupInfo{
				GID:    record.UID, 
				Name:   record.Group,
				Status: status,
			}

			groups = append(groups, group)
			fmt.Printf("  Grupo encontrado: %s (GID=%s, Estado=%s)\n",
				group.Name, group.GID, group.Status)
		}
	}

	return groups, nil
}


func GetUsersForDebug(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	partitionID := vars["partitionId"]

	if partitionID == "" {
		http.Error(w, "ID de partición requerido", http.StatusBadRequest)
		return
	}

	if !UserManagement.IsLoggedIn() || UserManagement.CurrentSession.PartitionID != partitionID {
		response := map[string]interface{}{
			"error":      "Se requiere login activo en la partición para ver usuarios",
			"suggestion": "Haga login primero con: POST /api/login",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	users, err := getUsersFromCurrentSession()
	if err != nil {
		http.Error(w, fmt.Sprintf("Error obteniendo usuarios: %v", err), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"partition_id": partitionID,
		"logged_user":  UserManagement.CurrentSession.Username,
		"users":        users,
	}

	json.NewEncoder(w).Encode(response)
}

func ValidatePartitionForUsers(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	partitionID := vars["partitionId"]

	w.Header().Set("Content-Type", "application/json")

	mountedPartitions := DiskManagement.GetMountedPartitions()

	found := false
	for _, partitions := range mountedPartitions {
		for _, part := range partitions {
			if strings.Trim(string(part.ID), "\x00") == partitionID {
				found = true
				break
			}
		}
		if found {
			break
		}
	}

	response := map[string]interface{}{
		"partition_id":    partitionID,
		"is_mounted":      found,
		"is_formatted":    found, 
		"ready_for_users": found,
	}

	if !found {
		response["error"] = "Partición no encontrada o no montada"
	}

	json.NewEncoder(w).Encode(response)
}
