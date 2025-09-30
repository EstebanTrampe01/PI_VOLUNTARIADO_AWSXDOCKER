package handlers

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"
)

type BatchExecuteResult struct {
	TotalCommands   int                      `json:"total_commands"`
	SuccessCommands int                      `json:"success_commands"`
	FailedCommands  int                      `json:"failed_commands"`
	Results         []CommandExecutionResult `json:"results"`
	ExecutionTime   string                   `json:"execution_time"`
	Success         bool                     `json:"success"`
}

type CommandExecutionResult struct {
	Command       string `json:"command"`
	Output        string `json:"output"`
	Success       bool   `json:"success"`
	Error         string `json:"error,omitempty"`
	LineNumber    int    `json:"line_number"`
	ExecutionTime string `json:"execution_time"`
}

func ExecuteBatchFromFile(filePath string) (*BatchExecuteResult, error) {
	startTime := time.Now()

	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("no se pudo abrir archivo: %v", err)
	}
	defer file.Close()

	result := &BatchExecuteResult{
		Results: []CommandExecutionResult{},
	}

	scanner := bufio.NewScanner(file)
	lineNumber := 0

	for scanner.Scan() {
		lineNumber++
		line := strings.TrimSpace(scanner.Text())

		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "//") {
			continue
		}

		cmdResult := executeSingleCommandForBatch(line, lineNumber)
		result.Results = append(result.Results, cmdResult)
		result.TotalCommands++

		if cmdResult.Success {
			result.SuccessCommands++
		} else {
			result.FailedCommands++

			if isCriticalError(line, cmdResult.Error) {
				fmt.Printf("Error crítico en línea %d, deteniendo ejecución\n", lineNumber)
				break
			}
		}

		time.Sleep(100 * time.Millisecond)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error leyendo archivo: %v", err)
	}

	result.ExecutionTime = time.Since(startTime).String()
	result.Success = result.FailedCommands == 0


	return result, nil
}

func executeSingleCommandForBatch(command string, lineNumber int) CommandExecutionResult {
	startTime := time.Now()

	output, success := executeCommandInternal(command)

	executionTime := time.Since(startTime)

	status := "✅"
	if !success {
		status = "❌"
	}
	fmt.Printf("[Línea %d] %s COMPLETADO en %s: %s\n", lineNumber, status, executionTime, command)

	if len(output) > 0 {
		preview := strings.Split(output, "\n")[0]
		if len(preview) > 100 {
			preview = preview[:100] + "..."
		}
	}

	result := CommandExecutionResult{
		Command:       command,
		Output:        output,
		Success:       success,
		LineNumber:    lineNumber,
		ExecutionTime: executionTime.String(),
	}

	time.Sleep(50 * time.Millisecond)

	return result
}

func isCriticalError(command, errorMsg string) bool {
	cmd := strings.ToLower(strings.TrimSpace(command))

	nonCriticalErrors := []string{
		"archivo ya existe",
		"partición ya está montada",
		"usuario ya existe",
		"grupo ya existe",
		"no existe",                 
		"no encontrado",             
		"no hay sesión",            
		"usuario no tiene permisos", 
		"credenciales incorrectas",  
		"directorio no creado",     
		"no existe la carpeta",      
		"usuario eliminado",         
		"grupo eliminado",           
		"usuario repetido",          
	}

	for _, nonCritical := range nonCriticalErrors {
		if strings.Contains(strings.ToLower(errorMsg), nonCritical) {
			return false
		}
	}

	if strings.HasPrefix(cmd, "mkdisk") {
		systemErrors := []string{
			"no se pudo crear",
			"error de escritura",
			"sin espacio",
			"permisos insuficientes",
		}

		for _, sysError := range systemErrors {
			if strings.Contains(strings.ToLower(errorMsg), sysError) {
				return true
			}
		}

		return false
	}

	if strings.HasPrefix(cmd, "rmdisk") ||
		(strings.HasPrefix(cmd, "fdisk") && strings.Contains(cmd, "-delete")) ||
		strings.HasPrefix(cmd, "unmount") {

		if strings.Contains(strings.ToLower(errorMsg), "error de sistema") ||
			strings.Contains(strings.ToLower(errorMsg), "archivo corrupto") {
			return true
		}

		return false
	}

	return false
}

func ExecuteBatchFromString(commandsString string) (*BatchExecuteResult, error) {

	startTime := time.Now()

	var commands []string
	if strings.Contains(commandsString, ";") {
		commands = strings.Split(commandsString, ";")
	} else {
		commands = strings.Split(commandsString, "\n")
	}

	result := &BatchExecuteResult{
		Results: []CommandExecutionResult{},
	}

	for i, command := range commands {
		command = strings.TrimSpace(command)
		if command == "" {
			continue
		}


		cmdResult := executeSingleCommandForBatch(command, i+1)
		result.Results = append(result.Results, cmdResult)
		result.TotalCommands++

		if cmdResult.Success {
			result.SuccessCommands++
		} else {
			result.FailedCommands++
		}

		time.Sleep(50 * time.Millisecond)
	}

	result.ExecutionTime = time.Since(startTime).String()
	result.Success = result.FailedCommands == 0

	return result, nil
}

func ParseExecuteCommand(command string) (string, bool, bool) {
	parts := strings.Fields(command)
	var path string
	verbose := false

	for _, part := range parts {
		if strings.HasPrefix(part, "-path=") {
			path = strings.TrimPrefix(part, "-path=")
			path = strings.Trim(path, "\"'")
		} else if part == "-v" || part == "-verbose" {
			verbose = true
		}
	}

	return path, path != "", verbose
}

func IsBatchCommand(command string) bool {
	cmd := strings.ToLower(strings.TrimSpace(command))
	return strings.HasPrefix(cmd, "execute") && strings.Contains(cmd, "-path=")
}

func IsMultiCommand(command string) bool {
	return strings.Contains(command, ";") && strings.Count(command, ";") >= 1
}
