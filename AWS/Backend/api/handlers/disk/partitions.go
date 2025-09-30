package disk

import (
	"Backend/DiskManagement"
	Structs "Backend/FileSystem"
	"Backend/Utils"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gorilla/mux"
)

type PartitionInfo struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Type       string `json:"type"`
	Size       string `json:"size"`
	Start      int32  `json:"start"`
	Status     string `json:"status"`
	Fit        string `json:"fit"`
	Filesystem string `json:"filesystem"`
	IsMounted  bool   `json:"is_mounted"`
	MountID    string `json:"mount_id,omitempty"`
}

func GetAllPartitions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	diskID := vars["diskId"]

	if diskID == "" {
		fmt.Println("⚠️ [DISK] No se especificó diskId, retornando array vacío")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]PartitionInfo{})
		return
	}

	partitions := getPartitionsUsingRealStructs(diskID)

	if partitions == nil {
		partitions = []PartitionInfo{}
	}

	if len(partitions) == 0 {
		fmt.Printf("Disco %s no tiene particiones montadas (normal), enviando array vacío\n", diskID)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(partitions)
}

func getPartitionsUsingRealStructs(diskID string) []PartitionInfo {
	var result []PartitionInfo

	fmt.Printf("Verificando si disco %s existe...\n", diskID)

	testDir := Utils.GetDiskDirectory()
	diskPath := filepath.Join(testDir, diskID+".dsk")

	if _, err := os.Stat(diskPath); os.IsNotExist(err) {
		fmt.Printf("Disco %s no existe en %s\n", diskID, diskPath)
		return result
	}

	mbr := readMBRFromDisk(diskID)
	if mbr == nil {
		fmt.Printf("No se pudo leer MBR del disco %s\n", diskID)
		return result
	}

	fmt.Printf("MBR leído correctamente para disco %s\n", diskID)

	mountedPartitions := DiskManagement.GetMountedPartitions()
	diskMountedParts := mountedPartitions[diskID]

	fmt.Printf("Particiones montadas para disco %s: %d\n", diskID, len(diskMountedParts))

	for i := 0; i < 4; i++ {
		partition := &mbr.Partitions[i]

		if partition.Size > 0 {
			name := strings.Trim(string(partition.Name[:]), "\x00")
			if name == "" {
				continue
			}

			partInfo := convertPartitionToInfo(partition, diskID, diskMountedParts)
			result = append(result, partInfo)

			fmt.Printf("   [DISK] Partición procesada: %s (%s, %s, %s)\n",
				partInfo.Name, partInfo.Size, partInfo.Status, partInfo.Filesystem)
		}
	}

	if len(result) == 0 {
		fmt.Printf(" Disco %s existe pero no tiene particiones creadas en el MBR (normal)\n", diskID)
	}

	fmt.Printf("Resultado final: %d particiones válidas para disco %s\n", len(result), diskID)
	return result
}

func readMBRFromDisk(diskID string) *Structs.MRB {
	testDir := Utils.GetDiskDirectory()
	diskPath := filepath.Join(testDir, diskID+".dsk")

	file, err := os.OpenFile(diskPath, os.O_RDONLY, 0644)
	if err != nil {
		fmt.Printf("Error abriendo disco %s: %v\n", diskID, err)
		return nil
	}
	defer file.Close()

	var mbr Structs.MRB
	if err := Utils.ReadObject(file, &mbr, 0); err != nil {
		fmt.Printf("Error leyendo MBR de disco %s: %v\n", diskID, err)
		return nil
	}

	fmt.Printf(" MBR leído para disco %s\n", diskID)
	return &mbr
}

func convertPartitionToInfo(partition *Structs.Partition, diskID string, mountedParts []DiskManagement.MountedPartition) PartitionInfo {
	name := strings.Trim(string(partition.Name[:]), "\x00")

	partType := convertPartitionType(partition.Type[0])
	fit := convertPartitionFit(partition.Fit[0])

	isMounted := false
	mountID := ""
	realPartitionID := ""
	filesystem := "Sin formatear"

	for _, mountedPart := range mountedParts {
		if strings.Trim(string(mountedPart.Name), "\x00") == name {
			isMounted = true
			mountID = strings.Trim(string(mountedPart.ID), "\x00")
			realPartitionID = mountID

			if mountedPart.Status == '1' {
				filesystem = detectFilesystemFromPartition(diskID, partition)
			}
			break
		}
	}

	if realPartitionID == "" {
		partitionIDFromMBR := strings.Trim(string(partition.Id[:]), "\x00")
		if partitionIDFromMBR != "" {
			realPartitionID = partitionIDFromMBR
		} else {
			realPartitionID = fmt.Sprintf("%s-unmounted-%s", diskID, name)
		}
	}

	status := "No montada"
	if isMounted {
		status = "Montada"
	}

	return PartitionInfo{
		ID:         realPartitionID,
		Name:       name,
		Type:       partType,
		Size:       formatPartitionSize(partition.Size),
		Start:      partition.Start,
		Status:     status,
		Fit:        fit,
		Filesystem: filesystem,
		IsMounted:  isMounted,
		MountID:    mountID,
	}
}

func convertPartitionType(typeByte byte) string {
	switch typeByte {
	case 'P', 'p':
		return "Primaria"
	case 'E', 'e':
		return "Extendida"
	case 'L', 'l':
		return "Lógica"
	default:
		return "Desconocido"
	}
}

func convertPartitionFit(fitByte byte) string {
	switch fitByte {
	case 'B', 'b':
		return "Best Fit"
	case 'F', 'f':
		return "First Fit"
	case 'W', 'w':
		return "Worst Fit"
	default:
		return "Desconocido"
	}
}

func detectFilesystemFromPartition(diskID string, partition *Structs.Partition) string {
	testDir := Utils.GetDiskDirectory()
	diskPath := filepath.Join(testDir, diskID+".dsk")

	file, err := os.OpenFile(diskPath, os.O_RDONLY, 0644)
	if err != nil {
		return "Error leyendo"
	}
	defer file.Close()

	var superblock Structs.Superblock
	superblocPos := int64(partition.Start)

	if err := Utils.ReadObject(file, &superblock, superblocPos); err != nil {
		return "Sin formatear"
	}

	if superblock.S_magic != 0xEF53 {
		return "Sin formatear"
	}

	switch superblock.S_filesystem_type {
	case 2:
		return "EXT2"
	case 3:
		return "EXT3"
	default:
		return "Desconocido"
	}
}

func formatPartitionSize(bytes int32) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)

	size := int64(bytes)
	switch {
	case size >= GB:
		return fmt.Sprintf("%.2f GB", float64(size)/GB)
	case size >= MB:
		return fmt.Sprintf("%.2f MB", float64(size)/MB)
	case size >= KB:
		return fmt.Sprintf("%.2f KB", float64(size)/KB)
	default:
		return fmt.Sprintf("%d bytes", size)
	}
}

func GetPartitionDetails(partitionID string) (*PartitionInfo, error) {
	if len(partitionID) < 2 {
		return nil, fmt.Errorf("ID de partición inválido: %s", partitionID)
	}

	diskID := string(partitionID[0])
	partitions := getPartitionsUsingRealStructs(diskID)

	for _, partition := range partitions {
		if partition.MountID == partitionID || partition.ID == partitionID {
			return &partition, nil
		}
	}

	return nil, fmt.Errorf("partición %s no encontrada", partitionID)
}
