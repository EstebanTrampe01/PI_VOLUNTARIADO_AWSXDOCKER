package filemanag

import (
	"Backend/FileManagement"
	Structs "Backend/FileSystem"
	"Backend/UserManagement"
	"Backend/Utils"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func GetFileInfoFromInode(file *os.File, sb *Structs.Superblock, inodeIndex int32, name, parentPath string) (*FileSystemItem, error) {

	var inode Structs.Inode
	inodePos := int64(sb.S_inode_start + inodeIndex*sb.S_inode_size)
	if err := Utils.ReadObject(file, &inode, inodePos); err != nil {
		return nil, err
	}

	var fileType string
	var size string

	switch inode.I_type[0] {
	case '0':
		fileType = "directory"
		size = "Directorio"
	case '1':
		fileType = "file"
		size = fmt.Sprintf("%d bytes", inode.I_size)
	default:
		fileType = "unknown"
		size = "Desconocido"
	}

	fullPath := filepath.Join(parentPath, name)
	if !strings.HasPrefix(fullPath, "/") {
		fullPath = "/" + fullPath
	}

	permissions := strings.Trim(string(inode.I_perm[:]), "\x00")
	if permissions == "" {
		permissions = "000" 
	}

	ownerUID := strconv.Itoa(int(inode.I_uid))
	groupGID := strconv.Itoa(int(inode.I_gid))

	ownerName := MapUIDToName(ownerUID)
	groupName := MapGIDToName(groupGID)

	modified := strings.Trim(string(inode.I_mtime[:]), "\x00")
	if modified == "" {
		modified = "Sin fecha"
	}

	result := &FileSystemItem{
		Name:        name,
		Type:        fileType,
		Size:        size,
		Modified:    modified,
		Permissions: permissions,
		Owner:       ownerName,
		Group:       groupName,
		OwnerUID:    ownerUID,
		GroupGID:    groupGID,
		FullPath:    fullPath,
	}
	return result, nil
}

func VerifyIsFile(filePath string) (bool, error) {
	partition, file, err := UserManagement.FindMountedPartitionForLoggedUser(UserManagement.CurrentSession.PartitionID)
	if err != nil {
		return false, fmt.Errorf("error accediendo partición: %v", err)
	}
	defer file.Close()

	sb, err := UserManagement.ReadSuperblock(file, partition)
	if err != nil {
		return false, fmt.Errorf("error leyendo superbloque: %v", err)
	}

	dir, fileName := filepath.Split(filePath)
	dir = strings.TrimSuffix(dir, "/")
	if dir == "" {
		dir = "/"
	}

	dirInodeIndex, err := FindDirectoryInode(file, sb, dir)
	if err != nil {
		return false, fmt.Errorf("directorio padre no encontrado: %v", err)
	}

	fileInodeIndex, err := FindFileInDirectory(file, sb, dirInodeIndex, fileName)
	if err != nil {
		return false, fmt.Errorf("archivo no encontrado: %v", err)
	}

	var inode Structs.Inode
	inodePos := int64(sb.S_inode_start + fileInodeIndex*sb.S_inode_size)
	if err := Utils.ReadObject(file, &inode, inodePos); err != nil {
		return false, fmt.Errorf("error leyendo inodo: %v", err)
	}

	isFile := inode.I_type[0] == '1'

	return isFile, nil
}

func GetFileContentDirect(filePath string) (string, error) {
	files := map[string]string{
		"file1": filePath,
	}

	oldStdout := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	outputChan := make(chan string, 1)
	go func() {
		defer r.Close()
		output, _ := io.ReadAll(r)
		outputChan <- string(output)
	}()

	FileManagement.Cat(files)

	w.Close()
	os.Stdout = oldStdout

	output := <-outputChan

	return ExtractContentFromCatOutput(output), nil
}

func ExtractContentFromCatOutput(output string) string {
	lines := strings.Split(output, "\n")
	var contentLines []string
	inContent := false

	for _, line := range lines {
		if strings.Contains(line, "========================Start CAT========================") {
			inContent = true
			continue
		}
		if strings.Contains(line, "========================End CAT========================") {
			break
		}
		if inContent && !strings.HasPrefix(line, "==========") {
			contentLines = append(contentLines, line)
		}
	}

	return strings.Join(contentLines, "\n")
}
