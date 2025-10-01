package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"
)

type Consolidado struct {
	TotalRAM           uint64  `json:"total_ram"`
	RamLibre           uint64  `json:"ram_libre"`
	UsoRAM             uint64  `json:"uso_ram"`
	PorcentajeRAM      uint64  `json:"porcentaje_ram"`
	PorcentajeCPUUso   float64 `json:"porcentaje_cpu_uso"`
	PorcentajeCPULibre float64 `json:"porcentaje_cpu_libre"`
	ProcesosCorriendo  uint64  `json:"procesos_corriendo"`
	TotalProcesos      uint64  `json:"total_procesos"`
	ProcesosDurmiendo  uint64  `json:"procesos_durmiendo"`
	ProcesosZombie     uint64  `json:"procesos_zombie"`
	ProcesosParados    uint64  `json:"procesos_parados"`
	Hora               string  `json:"hora"`
}


//Definimos una variable de entorno
var apiURL= getEnv("API_URL", "http://localhost:4000/api/metricas")

type Metricas struct {
	Tipo   string      `json:"tipo"`   // Tipo de métrica (RAM, CPU, etc.)
	Datos  interface{} `json:"datos"`  // Datos de la métrica
	Tiempo string      `json:"tiempo"` // Fecha y hora de la métrica
}
//Estructura para almacenar la información de la RAM
type InfoRam struct{
	Total uint64 `json:"total"`
	Libre uint64 `json:"libre"`
	Uso   uint64 `json:"uso"`
	Porcentaje uint64 `json:"porcentaje"`
}

//Estructura para almacenar la información del disco
type InfoCpu struct {
	Porcentaje float64 `json:"porcentajeUso"`
}

type InfoProcesos struct{
	ProcesosCorriendo uint64 `json:"procesos_corriendo"`
	TotalProcesos     uint64 `json:"total_procesos"`
	ProcesosDurmiendo uint64 `json:"procesos_durmiendo"`
	ProcesosZombie    uint64 `json:"procesos_zombie"`
	ProcesosParados   uint64 `json:"procesos_parados"`
}


func main() {
	fmt.Println("Iniciando monitor de métricas...") 
	fmt.Println("Esperando a que la API esté lista...")
	http.HandleFunc("/metricas", func(w http.ResponseWriter, r *http.Request) {
	ram := leerInfoRam()
	cpu := leerInfoCpu()
	proc := leerInfoProcesos()

	data := Consolidado{
		TotalRAM:           ram.Total,
		RamLibre:           ram.Libre,
		UsoRAM:             ram.Uso,
		PorcentajeRAM:      ram.Porcentaje,
		PorcentajeCPUUso:   cpu.Porcentaje,
		PorcentajeCPULibre: 100 - cpu.Porcentaje,
		ProcesosCorriendo:  proc.ProcesosCorriendo,
		TotalProcesos:      proc.TotalProcesos,
		ProcesosDurmiendo:  proc.ProcesosDurmiendo,
		ProcesosZombie:     proc.ProcesosZombie,
		ProcesosParados:    proc.ProcesosParados,
		Hora:               time.Now().Format("2006-01-02 15:04:05"),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
})

	// Canales para polling
	InforamChan := make(chan InfoRam)
	InfoCpuChan := make(chan InfoCpu)
	InfoProcChan := make(chan InfoProcesos)

	// Pollers en background
	go pollRam("/proc/ram_202200314", InforamChan, time.Second)
	go pollCpu("/proc/cpu_202200314", InfoCpuChan, time.Second)
	go pollProcesos("/proc/procesos_202200314", InfoProcChan, time.Second)

	// Lógica que envía datos continuamente
	go func() {
		for {
			select {
			case ram := <-InforamChan:
				sendDataToAPI("ram", ram)
			case cpu := <-InfoCpuChan:
				sendDataToAPI("cpu", cpu)
			case procesos := <-InfoProcChan:
				sendDataToAPI("procesos", procesos)
			}
		}
	}()

	

	log.Println("Servidor HTTP corriendo en puerto 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil)) 
}



func getEnv(key, fallback string) string {
	if v:=os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func pollRam(path string, ch chan <- InfoRam, intterval time.Duration) {
	for{
		datos,err := ioutil.ReadFile(path)//Leemos el archivo
		if err != nil {
			fmt.Println("Error leyendo el archivo:",path, err)
		} else {
			fmt.Println("Leído RAM:", string(datos))//  DEBUG
			var info InfoRam
			if err := json.Unmarshal(datos, &info); err != nil { // Deserializamos el JSON
				fmt.Println("Error deserializando JSON RAM: ", err)
			} else {
				ch <- info// Enviamos la información al canal
			}
			
		}
		time.Sleep(intterval) // Esperamos el intervalo definido
	}
}

func pollCpu(path string, ch chan <- InfoCpu, intterval time.Duration) {
	for{
		datos,err := ioutil.ReadFile(path)//Leemos el archivo
		if err != nil {
			fmt.Println("Error leyendo %s: %v",path, err)
		} else {
			fmt.Println("Leído cpu:", string(datos))// DEBUG
			var info InfoCpu
			if err := json.Unmarshal(datos, &info); err != nil { // Deserializamos el JSON
				fmt.Println("Error deserializando JSON CPU: ", err)
			} else {
				ch <- info// Enviamos la información al canal
			}
			
		}
		time.Sleep(intterval) // Esperamos el intervalo definido
	}
}

func pollProcesos(path string, ch chan<- InfoProcesos, interval time.Duration) {
	for {
		datos, err := ioutil.ReadFile(path)
		if err != nil {
			fmt.Println("Error leyendo el archivo de procesos:", err)
		} else {
			fmt.Println("Leído procesos:", string(datos)) // DEBUG
			var info InfoProcesos
			if err := json.Unmarshal(datos, &info); err != nil {
				fmt.Println("Error deserializando JSON de procesos:", err)
			} else {
				ch <- info
			}
		}
		time.Sleep(interval)
	}
}



// sendDataToAPI envía los datos a la API
func sendDataToAPI(tipo string, data interface{}) {
	pay := Metricas{
		Tipo: tipo,
		Datos: data,
		Tiempo: time.Now().Format(time.RFC3339), // Formateamos la fecha y hora actual
	}

	jsonData, err := json.Marshal(pay) // Serializamos los datos a JSON
	if err != nil {
		fmt.Println("Error serializando datos: ", err)
		return
	}
	fmt.Println("Enviando", string(jsonData)) //  DEBUG

	resp, err := http.Post(apiURL+ "/" +tipo, "application/json", bytes.NewBuffer(jsonData)) // Enviamos los datos a la API
	if err != nil {
		fmt.Println("Error enviando datos a la API: ", err)
		return
	}
	defer resp.Body.Close() // Leemos la respuesta de la API

	if resp.StatusCode >= 300{
		log.Println("API devolvio status  %d al enviar  %s", resp.StatusCode, tipo)
	}else{
		log.Printf("Métrica %s enviada OK", tipo)
	}

}

func leerInfoRam() InfoRam {
	datos, err := ioutil.ReadFile("/proc/ram_202200314")
	if err != nil {
		fmt.Println("Error leyendo RAM:", err)
		return InfoRam{}
	}
	var info InfoRam
	if err := json.Unmarshal(datos, &info); err != nil {
		fmt.Println("Error deserializando JSON RAM:", err)
	}
	return info
}

func leerInfoCpu() InfoCpu {
	datos, err := ioutil.ReadFile("/proc/cpu_202200314")
	if err != nil {
		fmt.Println("Error leyendo CPU:", err)
		return InfoCpu{}
	}
	var info InfoCpu
	if err := json.Unmarshal(datos, &info); err != nil {
		fmt.Println("Error deserializando JSON CPU:", err)
	}
	return info
}

func leerInfoProcesos() InfoProcesos {
	datos, err := ioutil.ReadFile("/proc/procesos_202200314")
	if err != nil {
		fmt.Println("Error leyendo Procesos:", err)
		return InfoProcesos{}
	}
	var info InfoProcesos
	if err := json.Unmarshal(datos, &info); err != nil {
		fmt.Println("Error deserializando JSON Procesos:", err)
	}
	return info
}
