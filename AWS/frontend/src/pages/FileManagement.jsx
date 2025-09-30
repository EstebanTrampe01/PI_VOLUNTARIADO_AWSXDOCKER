import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export default function FileManagement() {
  const navigate = useNavigate();
  
  const [disks, setDisks] = useState([]);
  const [partitions, setPartitions] = useState([]);
  const [selectedDisk, setSelectedDisk] = useState(null);
  const [currentPartition, setCurrentPartition] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [breadcrumb, setBreadcrumb] = useState([{ name: "raíz", path: "/" }]);
  
  const [loadingDisks, setLoadingDisks] = useState(true);
  const [loadingPartitions, setLoadingPartitions] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  
  const [disksError, setDisksError] = useState(null);
  const [partitionsError, setPartitionsError] = useState(null);
  const [filesError, setFilesError] = useState(null);
  const [contentError, setContentError] = useState(null);

  useEffect(() => {
    loadDisks();
    console.log(' usando API:', API_BASE_URL);
  }, []);

  const handleItemClick = async (item) => {
    console.log('Item:', item.name, 'tipo:', item.type);
    
    if (item.type === 'directory') {
      setCurrentPath(item.full_path);
      setSelectedFile(null);
      setFileContent(null);
      setContentError(null);
      
      updateBreadcrumb(item.full_path);
      
      await loadFiles(item.full_path);
      
    } else if (item.type === 'file') {
      
      setSelectedFile(item);
      await loadFileContent(item.full_path);
      
    } else {
      alert(`Tipo desconocido: ${item.type}`);
    }
    
  };

  const FileSystemItem = ({ item, onClick }) => {
    return (
      <div 
        className={`flex items-center space-x-3 p-3 border border-white/20 rounded-lg cursor-pointer transition-all duration-200 ${
          item.type === 'directory' 
            ? 'hover:bg-blue-900/30 hover:border-blue-400/50 bg-blue-900/10'
            : 'hover:bg-green-900/30 hover:border-green-400/50 bg-green-900/10'
        }`}
        onClick={() => onClick(item)}
      >
        <span className="text-3xl">
          {item.type === 'directory' ? '📂' : '📄'}
        </span>
        <div className="flex-grow">
          <div className="font-medium text-white flex items-center space-x-2">
            <span>{item.name}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              item.type === 'directory' 
                ? 'bg-blue-800/50 text-blue-300' 
                : 'bg-green-800/50 text-green-300'
            }`}>
              {item.type === 'directory' ? 'DIR' : 'FILE'}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            {item.type === 'directory' 
              ? 'Directorio' 
              : `${item.size} • ${item.permissions}`}
          </div>
          <div className="text-xs text-gray-500">
            {item.owner}:{item.group} • {item.modified}
          </div>
        </div>
        <div className="text-xl">
          {item.type === 'directory' ? '▶️' : '👁️'}
        </div>
      </div>
    );
  };

  const loadFiles = async (path = currentPath) => {
    console.log('Cargando archivos:', path);
    
    if (!currentPartition) {
      console.error('No hay partición seleccionada');
      return;
    }
    
    try {
      setLoadingFiles(true);
      setFilesError(null);
      
      const response = await fetch(
        `${API_BASE_URL}/api/filesystem/${currentPartition.id}?path=${encodeURIComponent(path)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        const filesArray = Array.isArray(data) ? data : (data.files || []);
        
        filesArray.forEach((file, index) => {
          console.log(`${index + 1}. ${file.name} (${file.type})`);
        });
        
        setFiles(filesArray);
        
      } else {
        const errorText = await response.text();
        console.error('Error:', errorText);
        setFilesError(`Error: ${errorText}`);
        setFiles([]);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setFilesError(`Error de conexión: ${error.message}`);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadFileContent = async (filePath) => {
    console.log('Cargando contenido de archivo:', filePath);
    
    try {
      setLoadingContent(true);
      setContentError(null);
      
      const response = await fetch(
        `${API_BASE_URL}/api/file-content/${currentPartition.id}?path=${encodeURIComponent(filePath)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setFileContent(data.content || 'Archivo vacío');
      } else {
        const errorText = await response.text();
        console.error('Error cargando contenido:', errorText);
        setContentError(`Error: ${errorText}`);
        setFileContent(null);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      setContentError(`Error de conexión: ${error.message}`);
      setFileContent(null);
    } finally {
      setLoadingContent(false);
    }
  };

  const updateBreadcrumb = (path) => {
    const pathParts = path.split('/').filter(part => part !== '');
    
    if (pathParts.length === 0) {
      setBreadcrumb([{ name: 'raíz', path: '/' }]);
    } else {
      const newBreadcrumb = [{ name: 'raíz', path: '/' }];
      let currentPath = '';
      
      for (const part of pathParts) {
        currentPath += '/' + part;
        newBreadcrumb.push({ name: part, path: currentPath });
      }
      
      setBreadcrumb(newBreadcrumb);
    }
  };

  const navigateToPath = async (path) => {
    console.log('Navegando a:', path);
    
    setCurrentPath(path);
    setSelectedFile(null);
    setFileContent(null);
    setContentError(null);
    
    await loadFiles(path);
  };

  const loadDisks = async () => {
    try {
      setLoadingDisks(true);
      setDisksError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/disks`);
      if (response.ok) {
        const data = await response.json();
        setDisks(data);
      } else {
        setDisksError('Error cargando discos');
      }
    } catch (error) {
      setDisksError(`Error de conexión: ${error.message}`);
    } finally {
      setLoadingDisks(false);
    }
  };

  const loadPartitions = async (diskId) => {
    try {
      setLoadingPartitions(true);
      setPartitionsError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/partitions/${diskId}`);
      if (response.ok) {
        const data = await response.json();
        setPartitions(data);
      } else {
        setPartitionsError('Error cargando particiones');
      }
    } catch (error) {
      setPartitionsError(`Error de conexión: ${error.message}`);
    } finally {
      setLoadingPartitions(false);
    }
  };

  const handleDiskSelect = async (disk) => {
    setSelectedDisk(disk);
    setCurrentPartition(null);
    setFiles([]);
    setSelectedFile(null);
    setFileContent(null);
    setCurrentPath("/");
    setBreadcrumb([{ name: "raíz", path: "/" }]);
    
    await loadPartitions(disk.id);
  };

  const handlePartitionSelect = async (partition) => {
    if (!partition.is_mounted) {
      alert('Esta partición no está montada. Use la consola para montarla primero.');
      return;
    }
    
    setCurrentPartition(partition);
    setFiles([]);
    setSelectedFile(null);
    setFileContent(null);
    setCurrentPath("/");
    setBreadcrumb([{ name: "raíz", path: "/" }]);
    
    await loadFiles("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] text-white">
      <div className="sticky top-0 z-10 border-b border-white/20 p-4 flex justify-between items-center bg-gradient-to-r from-[#0f172a]/95 to-[#1e1b4b]/95 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">📁 Explorador de Archivos</h1>
          
          <div className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs">
            Ubicacion Management
          </div>
          
          {currentPartition && (
            <div className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-sm">
              📂 {currentPartition.name} ({currentPartition.id})
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate("/console", { state: { fromManagement: true } })}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg transition"
          >
            Consola Debug
          </button>
          <button
            onClick={() => navigate("/console")}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition"
          >
            💻 Consola
          </button>
          <button
            onClick={() => navigate("/")}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition"
          >
            🏠 Inicio
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-1/3 bg-black/30 border-r border-white/20 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-3">💾 Discos</h3>
              {loadingDisks ? (
                <div className="text-gray-400">Cargando discos...</div>
              ) : disksError ? (
                <div className="text-red-400">{disksError}</div>
              ) : (
                <div className="space-y-2">
                  {disks.map((disk) => (
                    <div
                      key={disk.id}
                      className={`p-3 border rounded-lg cursor-pointer transition ${
                        selectedDisk?.id === disk.id
                          ? "border-blue-400 bg-blue-900/30"
                          : "border-white/20 hover:border-blue-400/50"
                      }`}
                      onClick={() => handleDiskSelect(disk)}
                    >
                      <div className="font-medium">🗄️ Disco {disk.id}</div>
                      <div className="text-sm text-gray-400">{disk.size} • {disk.partitions} particiones</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedDisk && (
              <div>
                <h3 className="text-lg font-bold mb-3">📂 Particiones</h3>
                {loadingPartitions ? (
                  <div className="text-gray-400">Cargando particiones...</div>
                ) : partitionsError ? (
                  <div className="text-red-400">❌ {partitionsError}</div>
                ) : (
                  <div className="space-y-2">
                    {partitions.map((partition) => (
                      <div
                        key={partition.id}
                        className={`p-3 border rounded-lg cursor-pointer transition ${
                          currentPartition?.id === partition.id
                            ? "border-green-400 bg-green-900/30"
                            : partition.is_mounted
                            ? "border-white/20 hover:border-green-400/50"
                            : "border-gray-600 bg-gray-800/30"
                        }`}
                        onClick={() => handlePartitionSelect(partition)}
                      >
                        <div className="font-medium">
                          {partition.is_mounted ? "🟢" : "🔴"} {partition.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {partition.size} • {partition.filesystem}
                        </div>
                        {!partition.is_mounted && (
                          <div className="text-xs text-red-400">No montada</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-1/3 bg-black/20 p-4 overflow-y-auto">
          {currentPartition ? (
            <div>
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  {breadcrumb.map((crumb, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      {index > 0 && <span>/</span>}
                      <button
                        className="hover:text-white transition"
                        onClick={() => navigateToPath(crumb.path)}
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3">📋 Archivos y Carpetas</h3>
                {loadingFiles ? (
                  <div className="text-gray-400">Cargando archivos...</div>
                ) : filesError ? (
                  <div className="text-red-400"> {filesError}</div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <FileSystemItem 
                        key={`${file.name}-${file.type}-${index}`} 
                        item={file} 
                        onClick={handleItemClick}
                      />
                    ))}
                    
                    {files.length === 0 && (
                      <div className="text-gray-400 text-center py-8">
                        📁 Directorio vacío
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">
              Seleccione una partición montada para explorar archivos
            </div>
          )}
        </div>

        <div className="w-1/3 bg-black/10 border-l border-white/20 p-4 overflow-y-auto">
          {selectedFile ? (
            <div>
              <h3 className="text-lg font-bold mb-3">📄 {selectedFile.name}</h3>
              <div className="text-sm text-gray-400 mb-4">
                <div>Tamaño: {selectedFile.size}</div>
                <div>Modificado: {selectedFile.modified}</div>
                <div>Propietario: {selectedFile.owner}:{selectedFile.group}</div>
                <div>Permisos: {selectedFile.permissions}</div>
              </div>
              
              {loadingContent ? (
                <div className="text-gray-400">Cargando contenido...</div>
              ) : contentError ? (
                <div className="text-red-400"> {contentError}</div>
              ) : fileContent !== null ? (
                <div className="bg-black/50 p-4 rounded-lg">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                    {fileContent}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">
              Seleccione un archivo para ver su contenido
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
