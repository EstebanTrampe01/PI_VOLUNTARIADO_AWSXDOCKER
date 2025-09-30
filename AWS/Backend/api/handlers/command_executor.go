package handlers

import (
	"Backend/Analyzer"
	"fmt"
	"io"
	"os"
	"strings"
)

type CommandResult struct {
	Output  string
	Success bool
}

func executeCommandInternal(command string) (string, bool) {
	if IsSafeCommand(command) {
		return ExecuteSafeCommand(command)
	}

	return executeNormalCommand(command)
}

func executeNormalCommand(command string) (string, bool) {
	oldStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		return fmt.Sprintf("Error interno: %v", err), false
	}

	os.Stdout = w

	outputChan := make(chan string, 1)
	go func() {
		defer r.Close()
		output, _ := io.ReadAll(r)
		outputChan <- string(output)
	}()

	Analyzer.ProcessCommand(command)

	w.Close()
	os.Stdout = oldStdout

	output := <-outputChan

	success := determineCommandSuccess(command, output)

	return output, success
}

func determineCommandSuccess(command, output string) bool {
	cmd := strings.ToLower(strings.TrimSpace(command))

	if strings.Contains(output, "==========Error:") {
		return false
	}

	switch {
	case strings.HasPrefix(cmd, "mkdisk"):
		return strings.Contains(output, "FIN COMANDO MKDISK") ||
			strings.Contains(output, "Disco creado exitosamente") ||
			!strings.Contains(output, "Error:")

	case strings.HasPrefix(cmd, "fdisk"):
		return !strings.Contains(output, "Error:") ||
			strings.Contains(output, "Partición creada") ||
			strings.Contains(output, "Partición eliminada")

	case strings.HasPrefix(cmd, "mount"):
		return !strings.Contains(output, "Error:") ||
			strings.Contains(output, "montada exitosamente")

	case strings.HasPrefix(cmd, "mkfs"):
		return !strings.Contains(output, "Error:") ||
			strings.Contains(output, "formateada exitosamente")

	case strings.HasPrefix(cmd, "login"):
		return !strings.Contains(output, "Error:") ||
			strings.Contains(output, "Login exitoso")

	case strings.HasPrefix(cmd, "logout"):
		return !strings.Contains(output, "Error:") ||
			strings.Contains(output, "Sesión cerrada")

	case strings.HasPrefix(cmd, "mkgrp") || strings.HasPrefix(cmd, "mkusr"):
		return !strings.Contains(output, "Error:")

	case strings.HasPrefix(cmd, "mkdir") || strings.HasPrefix(cmd, "mkfile"):
		return !strings.Contains(output, "Error:")

	case strings.HasPrefix(cmd, "cat") || strings.HasPrefix(cmd, "find"):
		return !strings.Contains(output, "Error:")

	case strings.HasPrefix(cmd, "rep"):
		return !strings.Contains(output, "Error:") ||
			strings.Contains(output, "Reporte generado")
	}

	return !strings.Contains(output, "Error:")
}