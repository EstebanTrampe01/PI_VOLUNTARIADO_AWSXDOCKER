import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export default function Management() {
  const navigate = useNavigate();
  
  const [currentView, setCurrentView] = useState("disks");
  const [selectedDisk, setSelectedDisk] = useState(null);
  const [selectedPartition, setSelectedPartition] = useState(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [disks, setDisks] = useState([]);
  const [partitions, setPartitions] = useState([]);
  const [fileSystem, setFileSystem] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log('Component loaded - usando API:', API_BASE_URL);
    fetchDisks();
  }, []);

  const fetchDisks = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/disks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setDisks(data);
      setLoading(false);
      
    } catch (err) {
      setError(`Error al cargar los discos: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchPartitions = async (diskId) => {
    setLoading(true);
    setError("");
    try {
      
      const response = await fetch(`${API_BASE_URL}/api/partitions/${diskId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setPartitions(data);
      setLoading(false);
      
    } catch (err) {
      setError(`Error al cargar las particiones: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchFileSystem = async (partitionId, path = "/") => {
    setLoading(true);
    setError("");
    try {
      
      const response = await fetch(`${API_BASE_URL}/api/filesystem/${partitionId}?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        if (response.status === 401) {
          setError("Sesión expirada. Por favor, inicie sesión nuevamente.");
          navigate("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      let fileSystemData = data;
      if (data === null || data === undefined) {
        console.log(" Backend retornó null, usando array vacío");
        fileSystemData = [];
      }
      
      if (!Array.isArray(fileSystemData)) {
        console.log(" Data no es array, convirtiendo a array vacío");
        fileSystemData = [];
      }
      
      setFileSystem(fileSystemData);
      setLoading(false);
      
      console.log(` Directorio ${path} contiene ${fileSystemData.length} elementos:`);
      fileSystemData.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} (tipo: ${item.type})`);
      });
      
    } catch (err) {
      if (err.message.includes("data is null")) {
        setFileSystem([]);
        setError("");
      } else {
        setError(`Error al cargar el sistema de archivos: ${err.message}`);
      }
      setLoading(false);
    }
  };

  const fetchFileContent = async (partitionId, filePath) => {
    try {
      
      const response = await fetch(`${API_BASE_URL}/api/file-content/${partitionId}?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data;
      
    } catch (err) {
      setError(`Error al leer el archivo: ${err.message}`);
      return null;
    }
  };
  
  const handleDiskSelect = async (disk) => {
    console.log(" Disk selected:", disk);
    setSelectedDisk(disk);
    setSelectedPartition(null);
    setCurrentPath("/");
    setSelectedFile(null);
    setCurrentView("partitions");
    await fetchPartitions(disk.id);
  };

  const handlePartitionSelect = async (partition) => {
    
    if (partition.status === "No montada") {
      setError(`Esta partición (${partition.id}) no está montada. Móntela primero: mount -driveletter=${selectedDisk?.id} -name=${partition.name}`);
      return;
    }
    
    if (partition.status === "Montada (inactiva)") {
      setError(`Esta partición (${partition.id}) está montada pero inactiva. Verifique el estado del sistema.`);
      return;
    }
    
    if (partition.filesystem === "Desconocido" || partition.filesystem === "Sin formatear") {
      setError(`Esta partición (${partition.id}) está montada pero NO formateada. Formatéela primero: mkfs -id=${partition.id} -fs=2fs`);
      return;
    }
    
    setSelectedPartition(partition);
    setCurrentPath("/");
    setSelectedFile(null);
    setCurrentView("files");
    await fetchFileSystem(partition.id, "/");
  };

  const handleFileSelect = async (file) => {
    console.log("File selected:", file);
    console.log("Tipo detectado:", file.type);
    
    if (file.type === "directory") {
      console.log("ES DIRECTORIO - Navegando...");
      
      const newPath = currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
      console.log("Navegando a:", newPath);
      
      setCurrentPath(newPath);
      setSelectedFile(null);
      await fetchFileSystem(selectedPartition.id, newPath);
      
    } else if (file.type === "file") {
      console.log("ES ARCHIVO - Mostrando contenido...");
      
      const filePath = currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
      console.log("Cargando contenido de:", filePath);
      
      const content = await fetchFileContent(selectedPartition.id, filePath);
      if (content) {
        setSelectedFile({
          ...file,
          content: content.content,
          path: filePath
        });
      }
    } else {
      console.error("TIPO DESCONOCIDO:", file.type);
      setError(`Tipo de archivo desconocido: ${file.type}`);
    }
  };

  const goBack = () => {
    if (currentView === "files" && selectedFile) {
      setSelectedFile(null);
    } else if (currentView === "files" && currentPath !== "/") {
      const pathParts = currentPath.split("/").filter(p => p);
      pathParts.pop();
      const newPath = pathParts.length === 0 ? "/" : "/" + pathParts.join("/");
      setCurrentPath(newPath);
      setSelectedFile(null);
      fetchFileSystem(selectedPartition.id, newPath);
    } else if (currentView === "files") {
      setCurrentView("partitions");
      setSelectedPartition(null);
      setFileSystem([]);
      setSelectedFile(null);
    } else if (currentView === "partitions") {
      setCurrentView("disks");
      setSelectedDisk(null);
      setPartitions([]);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST'
      });
      
      if (response.ok) {
        localStorage.removeItem('mia_session');
        navigate("/");
      }
    } catch (err) {
      console.error("Error during logout:", err);
      localStorage.removeItem('mia_session');
      navigate("/");
    }
  };

  const goToConsole = () => {
    navigate("/console", { state: { fromManagement: true } });
  };

  const renderBreadcrumb = () => {
    const items = [];
    
    if (currentView === "disks") {
      items.push({ label: "Discos", active: true });
    } else if (currentView === "partitions") {
      items.push({ label: "Discos", onClick: () => { setCurrentView("disks"); setSelectedDisk(null); } });
      items.push({ label: selectedDisk?.name, active: true });
    } else if (currentView === "files") {
      items.push({ label: "Discos", onClick: () => { setCurrentView("disks"); setSelectedDisk(null); setSelectedPartition(null); } });
      items.push({ label: selectedDisk?.name, onClick: () => { setCurrentView("partitions"); setSelectedPartition(null); } });
      items.push({ label: selectedPartition?.id, onClick: () => setCurrentPath("/") });
      
      if (currentPath !== "/") {
        const pathParts = currentPath.split("/").filter(p => p);
        pathParts.forEach((part, index) => {
          const isLast = index === pathParts.length - 1;
          items.push({
            label: part,
            active: isLast,
            onClick: isLast ? null : () => {
              const newPath = "/" + pathParts.slice(0, index + 1).join("/");
              setCurrentPath(newPath);
              fetchFileSystem(selectedPartition.id, newPath);
            }
          });
        });
      }
    }

    return (
      <div className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="text-gray-400 mx-2">/</span>}
            {item.active ? (
              <span className="text-blue-400 font-medium">{item.label}</span>
            ) : (
              <button
                onClick={item.onClick}
                className="text-gray-300 hover:text-white transition"
              >
                {item.label}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] text-white flex">
      
      <div className="w-80 bg-white/5 backdrop-blur-sm border-r border-white/10 flex flex-col">
        
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold">Explorador de Archivos</h2>
          <p className="text-sm text-gray-400">Sistema EXT2/EXT3</p>
          <div className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs mt-2">
            Actualmente Management
          </div>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={() => setCurrentView("disks")}
            className={`w-full text-left px-3 py-2 rounded-lg transition ${
              currentView === "disks" ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/10"
            }`}
          >
            🖥️ Discos
          </button>
          
          <button
            onClick={() => setCurrentView("partitions")}
            disabled={!selectedDisk}
            className={`w-full text-left px-3 py-2 rounded-lg transition ${
              currentView === "partitions" ? "bg-blue-500/20 text-blue-400" : 
              selectedDisk ? "hover:bg-white/10" : "opacity-50 cursor-not-allowed"
            }`}
          >
            💾 Particiones
          </button>
          
          <button
            onClick={() => setCurrentView("files")}
            disabled={!selectedPartition}
            className={`w-full text-left px-3 py-2 rounded-lg transition ${
              currentView === "files" ? "bg-blue-500/20 text-blue-400" : 
              selectedPartition ? "hover:bg-white/10" : "opacity-50 cursor-not-allowed"
            }`}
          >
            📁 Sistema de Archivos
          </button>
        </div>

        <div className="flex-grow p-4">
          <div className="bg-white/5 rounded-lg p-3">
            <h4 className="font-medium mb-2">Vista Actual</h4>
            <p className="text-sm text-gray-300">Vista: {currentView}</p>
            {selectedDisk && (
              <p className="text-sm text-gray-300">Disco: {selectedDisk.name}</p>
            )}
            {selectedPartition && (
              <p className="text-sm text-gray-300">Partición: {selectedPartition.id}</p>
            )}
            {currentPath !== "/" && (
              <p className="text-sm text-gray-300">Ruta: {currentPath}</p>
            )}
          </div>
        </div>

      </div>

      <div className="flex-grow flex flex-col">
        
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Sistema de Archivos 🐰🐢</h1>
            {currentView !== "disks" && (
              <button
                onClick={goBack}
                className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm transition"
              >
                ← Atrás
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={goToConsole}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition flex items-center space-x-2"
            >
              <span>💻</span>
              <span>Consola</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-white/5">
          {renderBreadcrumb()}
        </div>

        {loading && (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p>Cargando datos...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4">
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
              <button 
                onClick={() => setError("")}
                className="mt-2 bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-sm transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="flex-grow p-6">
            
            {currentView === "disks" && (
              <div>
                <h3 className="text-2xl font-semibold mb-6">Discos Disponibles</h3>
                {disks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-yellow-200 mb-3">
                        💾 No hay discos creados aún
                      </h4>
                      <p className="text-sm text-yellow-200 mb-4">
                        Use la consola para crear discos primero
                      </p>
                      <code className="text-blue-400 bg-blue-900/30 px-3 py-1 rounded">
                        mkdisk -size=100 -unit=m
                      </code>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {disks.map(disk => (
                      <div
                        key={disk.id}
                        onClick={() => handleDiskSelect(disk)}
                        className={`bg-white/10 rounded-xl p-6 cursor-pointer transition transform hover:scale-105 ${
                          selectedDisk?.id === disk.id ? "ring-2 ring-blue-400 bg-blue-500/20" : "hover:bg-white/20"
                        }`}
                      >
                        <div className="flex items-center mb-4">
                          <span className="text-4xl mr-3">🖥️</span>
                          <div>
                            <h4 className="text-lg font-medium">{disk.name}</h4>
                            <p className="text-sm text-gray-400">Disco Virtual</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-300">
                            <span className="font-medium">ID:</span> {disk.id}
                          </p>
                          <p className="text-sm text-gray-300">
                            <span className="font-medium">Tamaño:</span> {disk.size}
                          </p>
                          <p className="text-sm text-gray-400">
                            <span className="font-medium">Ruta:</span> {disk.path}
                          </p>
                        </div>
                        {selectedDisk?.id === disk.id && (
                          <div className="mt-3 text-blue-400 text-sm font-medium">
                            ✓ Seleccionado
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentView === "partitions" && (
              <div>
                <h3 className="text-2xl font-semibold mb-6">
                  Particiones de {selectedDisk?.name}
                </h3>
                {partitions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-6 mb-6">
                      <h4 className="text-lg font-semibold text-yellow-200 mb-3">
                        📋 No hay particiones montadas para este disco
                      </h4>
                      <div className="text-left space-y-2">
                        <p className="text-sm text-yellow-200">
                          <strong>Causa:</strong>
                        </p>
                        <ul className="text-sm text-yellow-200 list-disc list-inside space-y-1">
                          <li>El disco existe pero no tiene particiones creadas</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                        <h5 className="font-semibold text-blue-200 mb-2">📝 Crear Particiones</h5>
                        <div className="text-left space-y-2">
                          <code className="block text-blue-400 text-sm bg-blue-900/30 p-2 rounded">
                            fdisk -size=50 -driveletter={selectedDisk?.id} -name=Part1
                          </code>
                          <code className="block text-blue-400 text-sm bg-blue-900/30 p-2 rounded">
                            fdisk -size=30 -driveletter={selectedDisk?.id} -name=Part2
                          </code>
                        </div>
                      </div>
                      
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                        <h5 className="font-semibold text-green-200 mb-2">💾 Montar Particiones</h5>
                        <div className="text-left space-y-2">
                          <code className="block text-green-400 text-sm bg-green-900/30 p-2 rounded">
                            mount -driveletter={selectedDisk?.id} -name=Part1
                          </code>
                          <code className="block text-green-400 text-sm bg-green-900/30 p-2 rounded">
                            mount -driveletter={selectedDisk?.id} -name=Part2
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-6">
                      <p className="text-green-200 text-sm">
                        <strong>{partitions.length} particiones montadas</strong> encontradas en {selectedDisk?.name}
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      {partitions.map(partition => (
                        <div
                          key={partition.id}
                          onClick={() => handlePartitionSelect(partition)}
                          className={`bg-white/10 rounded-lg p-4 cursor-pointer transition ${
                            partition.status === "Montada" && partition.filesystem !== "Desconocido" && partition.filesystem !== "Sin formatear"
                              ? "hover:bg-white/20 border-l-4 border-green-500" 
                              : partition.status === "Montada" && (partition.filesystem === "Desconocido" || partition.filesystem === "Sin formatear")
                              ? "hover:bg-white/20 border-l-4 border-yellow-500"
                              : "hover:bg-white/20 border-l-4 border-red-500"
                          } ${
                            selectedPartition?.id === partition.id ? "ring-2 ring-blue-400 bg-blue-500/20" : ""
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-medium">ID: {partition.id}</h4>
                              <p className="text-sm text-gray-300">{partition.name}</p>
                              <p className="text-sm text-gray-400">Tipo: {partition.type}</p>
                              <div className="mt-2 flex items-center space-x-3">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  partition.status === "Montada" 
                                    ? "bg-green-500/20 text-green-400" 
                                    : partition.status === "Montada (inactiva)"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}>
                                  {partition.status}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  partition.filesystem === "Sin formatear" || partition.filesystem === "Desconocido"
                                    ? "bg-gray-500/20 text-gray-400" 
                                    : "bg-blue-500/20 text-blue-400"
                                }`}>
                                  {partition.filesystem}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-300 font-mono">{partition.size}</p>
                              {partition.status === "Montada" && partition.filesystem !== "Desconocido" && partition.filesystem !== "Sin formatear" && (
                                <p className="text-xs text-green-400 mt-1">Clic para explorar →</p>
                              )}
                              {partition.status === "No montada" && (
                                <p className="text-xs text-red-400 mt-1">Montar primero</p>
                              )}
                              {(partition.filesystem === "Desconocido" || partition.filesystem === "Sin formatear") && partition.status === "Montada" && (
                                <p className="text-xs text-yellow-400 mt-1">Formatear primero</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentView === "files" && !selectedFile && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold">
                    {currentPath === "/" ? "Directorio Raíz" : currentPath}
                  </h3>
                  <div className="text-sm text-gray-400">
                    Partición: <span className="text-blue-400">{selectedPartition?.id}</span> | 
                    Filesystem: <span className="text-green-400">{selectedPartition?.filesystem}</span>
                  </div>
                </div>
                
                {fileSystem.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6 mb-6">
                      <h4 className="text-lg font-semibold text-blue-200 mb-3">
                        📁 Este directorio está vacío
                      </h4>
                      <p className="text-sm text-blue-200">
                        {currentPath === "/" 
                          ? "Esta partición está formateada pero no tiene contenido aún" 
                          : `El directorio ${currentPath} no contiene archivos ni carpetas`}
                      </p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                        <h5 className="font-semibold text-green-200 mb-2">📁 Crear Directorios</h5>
                        <div className="text-left space-y-2">
                          <code className="block text-green-400 text-sm bg-green-900/30 p-2 rounded">
                            mkdir -path=/home/docs -r
                          </code>
                          <code className="block text-green-400 text-sm bg-green-900/30 p-2 rounded">
                            mkdir -path=/home/docs/user
                          </code>
                        </div>
                      </div>
                      
                      <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-4">
                        <h5 className="font-semibold text-purple-200 mb-2">📄 Crear Archivos</h5>
                        <div className="text-left space-y-2">
                          <code className="block text-purple-400 text-sm bg-purple-900/30 p-2 rounded">
                            mkfile -path=/home/test.txt -size=100
                          </code>
                          <code className="block text-purple-400 text-sm bg-purple-900/30 p-2 rounded">
                            mkfile -path=/readme.md -size=50
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-6">
                      <p className="text-green-200 text-sm">
                        <strong>{fileSystem.length} elementos</strong> encontrados en {currentPath}
                      </p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-white/10">
                          <tr>
                            <th className="text-left p-4">Nombre</th>
                            <th className="text-left p-4">Tipo</th>
                            <th className="text-left p-4">Tamaño</th>
                            <th className="text-left p-4">Modificado</th>
                            <th className="text-left p-4">Permisos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fileSystem.map((item, index) => (
                            <tr
                              key={index}
                              onClick={() => handleFileSelect(item)}
                              className="border-t border-white/10 hover:bg-white/10 cursor-pointer transition"
                            >
                              <td className="p-4 flex items-center">
                                <span className="mr-3 text-xl">
                                  {item.type === "directory" ? "📁" : "📄"}
                                </span>
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  {item.name === "users.txt" && (
                                    <div className="text-xs text-blue-400">Sistema de usuarios</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.type === "directory" 
                                    ? "bg-blue-500/20 text-blue-400" 
                                    : "bg-green-500/20 text-green-400"
                                }`}>
                                  {item.type === "directory" ? "Directorio" : "Archivo"}
                                </span>
                              </td>
                              <td className="p-4">{item.size}</td>
                              <td className="p-4">{item.modified}</td>
                              <td className="p-4 font-mono text-sm">{item.permissions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedFile && (
              <div>
                <h3 className="text-2xl font-semibold mb-6">
                  Contenido de {selectedFile.name}
                </h3>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="bg-gray-900/50 rounded p-4 font-mono text-sm max-h-96 overflow-y-auto max-w-full">
                    <pre className="text-gray-300 whitespace-pre-wrap break-all overflow-wrap-anywhere">{selectedFile.content}</pre>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-gray-400">
                      Archivo: {selectedFile.path} | Tamaño: {selectedFile.size}
                    </p>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded transition"
                    >
                      Cerrar Archivo
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
