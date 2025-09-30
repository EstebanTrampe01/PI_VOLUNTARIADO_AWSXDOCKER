package filemanag

import (
	Structs "Backend/FileSystem"
	"Backend/UserManagement"
	"Backend/Utils"
	"fmt"
	"os"
	"strings"
)

func GetFilesFromDirectory(dirPath string) ([]FileSystemItem, error) {
	var files []FileSystemItem

	partition, file, err := UserManagement.FindMountedPartitionForLoggedUser(UserManagement.CurrentSession.PartitionID)
	if err != nil {
		return files, nil
	}
	defer file.Close()

	sb, err := UserManagement.ReadSuperblock(file, partition)
	if err != nil {
		return files, nil 
	}

	dirInodeIndex, err := FindDirectoryInode(file, sb, dirPath)
	if err != nil {
		if dirPath == "/" {
			return files, nil 
		}
		return files, nil 
	}

	dirContents, err := ReadDirectoryContents(file, sb, dirInodeIndex)
	if err != nil {
		return files, nil 
	}
	if len(dirContents) == 0 {
		return files, nil 
	}

	for _, content := range dirContents {
		if content.B_inodo == -1 {
			continue
		}

		name := strings.Trim(string(content.B_name[:]), "\x00")
		name = strings.TrimSpace(name)

		if name == "" || name == "." || name == ".." {
			continue
		}

		item, err := GetFileInfoFromInode(file, sb, content.B_inodo, name, dirPath)
		if err != nil {
			continue 
		}

		if item.Type != "file" && item.Type != "directory" {
			continue 
		}

		files = append(files, *item)
	}

	return files, nil 
}

func ReadDirectoryContents(file *os.File, sb *Structs.Superblock, dirInodeIndex int32) ([]Structs.Content, error) {
	var contents []Structs.Content

	var dirInode Structs.Inode
	inodePos := int64(sb.S_inode_start + dirInodeIndex*sb.S_inode_size)
	if err := Utils.ReadObject(file, &dirInode, inodePos); err != nil {
		return contents, nil 
	}

	if dirInode.I_type[0] != '0' {
		if dirInodeIndex == 0 {
			return contents, nil 
		}
		return nil, fmt.Errorf("no es un directorio")
	}

	hasBlocks := false
	for i := 0; i < 12; i++ {
		if dirInode.I_block[i] != -1 {
			hasBlocks = true
			break
		}
	}

	if !hasBlocks {
		return contents, nil 
	}

	for i := 0; i < 12; i++ {
		if dirInode.I_block[i] == -1 {
			continue 
		}

		var folderBlock Structs.Folderblock
		blockPos := int64(sb.S_block_start + dirInode.I_block[i]*sb.S_block_size)
		if err := Utils.ReadObject(file, &folderBlock, blockPos); err != nil {
			continue 
		}

		for j := 0; j < 4; j++ {
			if folderBlock.B_content[j].B_inodo != -1 {
				contents = append(contents, folderBlock.B_content[j])
			}
		}
	}

	return contents, nil 
}

func FindDirectoryInode(file *os.File, sb *Structs.Superblock, dirPath string) (int32, error) {
	if dirPath == "/" {
		var rootInode Structs.Inode
		inodePos := int64(sb.S_inode_start)
		if err := Utils.ReadObject(file, &rootInode, inodePos); err != nil {
			return -1, fmt.Errorf("inodo raíz no accesible")
		}

		if rootInode.I_type[0] == 0 || rootInode.I_type[0] == '\x00' {
			return -1, fmt.Errorf("partición sin estructura de directorios")
		}

		return 0, nil 
	}

	parts := strings.Split(strings.Trim(dirPath, "/"), "/")
	currentInode := int32(0)

	for _, part := range parts {
		if part == "" {
			continue
		}

		nextInode, err := FindFileInDirectory(file, sb, currentInode, part)
		if err != nil {
			return -1, fmt.Errorf("directorio '%s' no encontrado en path '%s'", part, dirPath)
		}

		currentInode = nextInode
	}

	return currentInode, nil
}

func FindFileInDirectory(file *os.File, sb *Structs.Superblock, dirInodeIndex int32, fileName string) (int32, error) {
	var dirInode Structs.Inode
	inodePos := int64(sb.S_inode_start + dirInodeIndex*sb.S_inode_size)
	if err := Utils.ReadObject(file, &dirInode, inodePos); err != nil {
		return -1, err
	}

	if dirInode.I_type[0] != '0' {
		return -1, fmt.Errorf("no es un directorio")
	}

	for i := 0; i < 12; i++ {
		if dirInode.I_block[i] == -1 {
			break
		}

		var folderBlock Structs.Folderblock
		blockPos := int64(sb.S_block_start + dirInode.I_block[i]*sb.S_block_size)
		if err := Utils.ReadObject(file, &folderBlock, blockPos); err != nil {
			continue
		}

		for j := 0; j < 4; j++ {
			if folderBlock.B_content[j].B_inodo == -1 {
				continue
			}

			name := strings.Trim(string(folderBlock.B_content[j].B_name[:]), "\x00")
			if name == fileName {
				return folderBlock.B_content[j].B_inodo, nil
			}
		}
	}

	return -1, fmt.Errorf("archivo '%s' no encontrado", fileName)
}
