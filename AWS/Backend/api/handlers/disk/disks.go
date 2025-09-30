package disk

import (
	Structs "Backend/FileSystem"
	"Backend/Utils"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type DiskInfo struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Size         string `json:"size"`
	Path         string `json:"path"`
	CreationDate string `json:"creation_date"`
	Signature    int32  `json:"signature"`
	Partitions   int    `json:"partitions"`
}

func GetAllDisks(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	disks := readDisksWithMBRInfo()

	if disks == nil {
		disks = []DiskInfo{}
	}

	fmt.Printf("Encontrados %d discos\n", len(disks))

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(disks)
}

func readDisksWithMBRInfo() []DiskInfo {
	var disks []DiskInfo

	testDir := Utils.GetDiskDirectory()
	if _, err := os.Stat(testDir); os.IsNotExist(err) {
		fmt.Printf("Directorio %s no existe, retornando array vacío\n", testDir)
		return disks
	}

	files, err := os.ReadDir(testDir)
	if err != nil {
		fmt.Printf(" Error leyendo directorio: %v\n", err)
		return disks
	}

	if len(files) == 0 {
		fmt.Printf("Directorio %s está vacío (no hay discos creados aún)\n", testDir)
		return disks
	}


	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".dsk") {
			fullPath := filepath.Join(testDir, file.Name())
			diskID := strings.TrimSuffix(file.Name(), ".dsk")

			diskInfo := readDiskMBRInfo(fullPath, diskID)
			if diskInfo != nil {
				disks = append(disks, *diskInfo)
				fmt.Printf(" Disco %s procesado exitosamente: %s, %d particiones\n",
					diskID, diskInfo.Size, diskInfo.Partitions)
			} else {
				fmt.Printf(" No se pudo procesar disco %s, omitiendo\n", diskID)
			}
		}
	}

	fmt.Printf(" Procesamiento completado: %d discos válidos\n", len(disks))
	return disks
}

func readDiskMBRInfo(diskPath, diskID string) *DiskInfo {
	file, err := os.OpenFile(diskPath, os.O_RDONLY, 0644)
	if err != nil {
		fmt.Printf(" Error abriendo disco %s: %v\n", diskID, err)
		return nil
	}
	defer file.Close()

	var mbr Structs.MRB
	if err := Utils.ReadObject(file, &mbr, 0); err != nil {
		fmt.Printf(" Error leyendo MBR de disco %s: %v\n", diskID, err)
		return nil
	}

	fileInfo, err := file.Stat()
	if err != nil {
		fmt.Printf(" Error obteniendo info de archivo %s: %v\n", diskID, err)
		return nil
	}

	partitionCount := 0
	for i := 0; i < 4; i++ {
		if mbr.Partitions[i].Size > 0 {
			partitionCount++
			partName := strings.Trim(string(mbr.Partitions[i].Name[:]), "\x00")
			fmt.Printf("    Partición %d: %s (tamaño: %d)\n", i+1, partName, mbr.Partitions[i].Size)
		}
	}

	creationDate := strings.Trim(string(mbr.CreationDate[:]), "\x00")
	if creationDate == "" {
		creationDate = "No disponible"
	}

	return &DiskInfo{
		ID:           diskID,
		Name:         filepath.Base(diskPath),
		Size:         formatFileSize(fileInfo.Size()),
		Path:         diskPath,
		CreationDate: creationDate,
		Signature:    mbr.MbrSize,
		Partitions:   partitionCount,
	}
}

func formatFileSize(bytes int64) string {
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

func GetDiskDetails(diskID string) (*DiskInfo, error) {
	testDir := Utils.GetDiskDirectory()
	diskPath := filepath.Join(testDir, diskID+".dsk")

	if _, err := os.Stat(diskPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("disco %s no encontrado", diskID)
	}

	diskInfo := readDiskMBRInfo(diskPath, diskID)
	if diskInfo == nil {
		return nil, fmt.Errorf("error leyendo información del disco %s", diskID)
	}

	return diskInfo, nil
}

func GetDiskMBR(diskID string) (*Structs.MRB, error) {
	testDir := Utils.GetDiskDirectory()
	diskPath := filepath.Join(testDir, diskID+".dsk")

	file, err := os.OpenFile(diskPath, os.O_RDONLY, 0644)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var mbr Structs.MRB
	if err := Utils.ReadObject(file, &mbr, 0); err != nil {
		return nil, err
	}

	return &mbr, nil
}
