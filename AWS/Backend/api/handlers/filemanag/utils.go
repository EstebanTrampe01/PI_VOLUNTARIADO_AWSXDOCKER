package filemanag

import "strings"

func MapUIDToName(uid string) string {
	switch uid {
	case "1":
		return "root"
	case "0":
		return "eliminado"
	default:
		return "user" + uid
	}
}

func MapGIDToName(gid string) string {
	switch gid {
	case "1":
		return "root"
	case "0":
		return "eliminado"
	default:
		return "grupo" + gid
	}
}

func IsKnownFileExtension(name string) bool {
	extensions := []string{".txt", ".log", ".cfg", ".conf", ".ini", ".dat", ".tmp"}
	name = strings.ToLower(name)
	for _, ext := range extensions {
		if strings.HasSuffix(name, ext) {
			return true
		}
	}
	return false
}
