package handlers

import (
	"Backend/Analyzer"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type StreamMessage struct {
	Type      string `json:"type"`
	Content   string `json:"content"`
	Timestamp string `json:"timestamp"`
}

func ExecuteWithDirectCommand(w http.ResponseWriter, r *http.Request, command string) {

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")

	for key, values := range w.Header() {
		fmt.Printf("  %s: %s\n", key, strings.Join(values, ", "))
	}

	if !strings.HasPrefix(strings.ToLower(command), "execute") {
		sendMessageWithDebug(w, "error", "Solo comandos execute para streaming")
		return
	}

	sendMessageWithDebug(w, "command", fmt.Sprintf("Ejecutando: %s", command))

	oldStdout := os.Stdout
	r_pipe, w_pipe, _ := os.Pipe()
	os.Stdout = w_pipe

	outputChan := make(chan string, 1)
	go func() {
		defer r_pipe.Close()
		output, _ := io.ReadAll(r_pipe)
		outputChan <- string(output)
	}()

	Analyzer.ProcessCommand(command)

	w_pipe.Close()
	os.Stdout = oldStdout

	fullOutput := <-outputChan

	lines := strings.Split(fullOutput, "\n")

	for i, line := range lines {
		if strings.TrimSpace(line) != "" {
			fmt.Printf("Línea %d: %s\n", i+1, line)
			sendMessageWithDebug(w, "output", line)
		}
	}

	sendMessageWithDebug(w, "complete", "Streaming completado")

}

func ExecuteWithRealStreaming(w http.ResponseWriter, r *http.Request) {
	sendMessage(w, "error", "Función obsoleta")
}

func sendMessageWithDebug(w http.ResponseWriter, msgType, content string) {

	message := StreamMessage{
		Type:      msgType,
		Content:   content,
		Timestamp: time.Now().Format("15:04:05"),
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		fmt.Printf("error JSON marshal: %v\n", err)
		return
	}

	sseMessage := fmt.Sprintf("data: %s\n\n", string(jsonData))

	n, err := w.Write([]byte(sseMessage))
	if err != nil {
		return
	}
	fmt.Printf(" Escritos %d bytes\n", n)

	if flusher, ok := w.(http.Flusher); ok {
		flusher.Flush()
	} else {
		fmt.Println("No se pudo hacer flush")
	}
}

func sendMessage(w http.ResponseWriter, msgType, content string) {
	message := StreamMessage{
		Type:      msgType,
		Content:   content,
		Timestamp: time.Now().Format("15:04:05"),
	}

	jsonData, _ := json.Marshal(message)
	fmt.Fprintf(w, "data: %s\n\n", string(jsonData))

	if flusher, ok := w.(http.Flusher); ok {
		flusher.Flush()
	}
}
