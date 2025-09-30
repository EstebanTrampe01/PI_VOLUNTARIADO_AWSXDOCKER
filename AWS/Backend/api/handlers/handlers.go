package handlers

import (
	"Backend/Analyzer"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

type CommandRequest struct {
	Command string `json:"command"`
}

type CommandResponse struct {
	Output  string `json:"output"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

func ExecuteCommand(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req CommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response := CommandResponse{
			Success: false,
			Error:   "Request JSON inválido",
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	if req.Command == "" {
		response := CommandResponse{
			Success: false,
			Error:   "Comando vacío",
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	oldStdout := os.Stdout
	r_pipe, w_pipe, _ := os.Pipe()
	os.Stdout = w_pipe

	Analyzer.ProcessCommand(req.Command)

	w_pipe.Close()
	os.Stdout = oldStdout

	output, _ := io.ReadAll(r_pipe)
	outputString := string(output)

	success := !strings.Contains(outputString, "Error:") &&
		!strings.Contains(outputString, "==========Error:")

	response := CommandResponse{
		Output:  outputString,
		Success: success,
	}

	if !success {
		response.Error = "El comando falló - revisar output para detalles"
	}

	json.NewEncoder(w).Encode(response)
}

func FormatFileSize(bytes int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)

	switch {
	case bytes >= GB:
		return fmt.Sprintf("%.2f GB", float64(bytes)/GB)
	case bytes >= MB:
		return fmt.Sprintf("%.2f MB", float64(bytes)/MB)
	case bytes >= KB:
		return fmt.Sprintf("%.2f KB", float64(bytes)/KB)
	default:
		return fmt.Sprintf("%d bytes", bytes)
	}
}
