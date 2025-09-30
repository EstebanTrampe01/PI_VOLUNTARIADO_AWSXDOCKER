import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:8080";

export default function GlobalView() {
  const navigate = useNavigate();
  
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPartition, setSelectedPartition] = useState(null);

  useEffect(() => {
    console.log('GlobalView component loaded');
    fetchGlobalScan();
  }, []);

  const fetchGlobalScan = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌍 [GLOBAL] Iniciando escaneo global...');
      
      const response = await fetch(`${API_BASE_URL}/api/global-scan`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🌍 [GLOBAL] Scan data received:', data);
        setScanData(data);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setError(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`Error de conexión: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePartitionClick = (partition) => {
    console.log('Partición seleccionada:', partition.partition_id);
    setSelectedPartition(partition);
  };

  const closeDetails = () => {
    setSelectedPartition(null);
  };

  const navigateToPartition = (partitionId) => {
    navigate("/management", { state: { targetPartition: partitionId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-lg">🌍 Escaneando todas las particiones...</p>
          <p className="text-sm text-gray-400 mt-2">Esto puede tomar unos segundos</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-red-400 mb-3">❌ Error en Escaneo Global</h3>
            <p className="text-red-200 mb-4">{error}</p>
            <div className="space-x-3">
              <button 
                onClick={fetchGlobalScan}
                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition"
              >
                🔄 Reintentar
              </button>
              <button
                onClick={() => navigate("/management")}
                className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] text-white">
      <div className="border-b border-white/20 p-4 flex justify-between items-center bg-gradient-to-r from-[#0f172a]/95 to-[#1e1b4b]/95 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">🌍 Vista Global del Sistema</h1>
          
          <div className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-xs">
            Global Scan v1.0
          </div>
          
          {scanData && (
            <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm">
              {scanData.total_partitions} particiones escaneadas
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchGlobalScan}
            className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Reescanear</span>
          </button>
          <button
            onClick={() => navigate("/management")}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition"
          >
            📁 Vista Normal
          </button>
          <button
            onClick={() => navigate("/console")}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition"
          >
            💻 Consola
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-1/3 bg-black/30 border-r border-white/20 p-4 overflow-y-auto">
          <h3 className="text-lg font-bold mb-4">📊 Resumen del Escaneo</h3>
          
          {scanData && (
            <div className="space-y-4">
              <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-500/30">
                <h4 className="text-sm font-semibold text-blue-300 mb-2">Sesión Actual</h4>
                <p className="text-lg font-bold text-blue-400">{scanData.current_session}</p>
                <p className="text-xs text-blue-200">Partición donde iniciaste sesión</p>
              </div>
              
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Estadísticas Generales</h4>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-green-900/30 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-400">{scanData.success_partitions}</p>
                    <p className="text-xs text-green-300">Con Datos</p>
                  </div>
                  
                  <div className="bg-gray-900/30 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-400">{scanData.empty_partitions}</p>
                    <p className="text-xs text-gray-300">Vacías</p>
                  </div>
                </div>
                
                <div className="bg-red-900/30 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-400">{scanData.error_partitions}</p>
                  <p className="text-xs text-red-300">Con Errores</p>
                </div>
              </div>
              
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Contenido Encontrado</h4>
                
                {scanData.results.filter(r => r.status === 'success').map((partition, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-white/10 last:border-b-0">
                    <span className="text-sm text-gray-400">{partition.partition_id}</span>
                    <div className="flex space-x-2 text-xs">
                      <span className="bg-green-800/50 text-green-300 px-2 py-1 rounded">{partition.file_count}f</span>
                      <span className="bg-blue-800/50 text-blue-300 px-2 py-1 rounded">{partition.directory_count}d</span>
                      {partition.has_users && <span className="bg-yellow-800/50 text-yellow-300 px-2 py-1 rounded">👥</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-1/3 bg-black/20 p-4 overflow-y-auto">
          <h3 className="text-lg font-bold mb-4">🗂️ Particiones Encontradas</h3>
          
          {scanData && (
            <div className="space-y-3">
              {scanData.results.map((partition, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    partition.status === 'success' 
                      ? 'border-green-500/50 bg-green-900/20 hover:bg-green-900/30 hover:border-green-400'
                      : partition.status === 'empty'
                      ? 'border-gray-500/50 bg-gray-900/20 hover:bg-gray-900/30 hover:border-gray-400'
                      : 'border-red-500/50 bg-red-900/20 hover:bg-red-900/30 hover:border-red-400'
                  } ${
                    selectedPartition?.partition_id === partition.partition_id
                      ? 'ring-2 ring-purple-400 scale-105'
                      : ''
                  }`}
                  onClick={() => handlePartitionClick(partition)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{partition.partition_id}</h4>
                      <p className="text-xs text-gray-400">Disco: {partition.disk_id}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        partition.status === 'success' 
                          ? 'bg-green-500/20 text-green-300'
                          : partition.status === 'empty'
                          ? 'bg-gray-500/20 text-gray-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {partition.status.toUpperCase()}
                      </span>
                      
                      {partition.status === 'success' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToPartition(partition.partition_id);
                          }}
                          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition"
                        >
                          Explorar →
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {partition.status === 'success' && (
                    <div className="flex justify-between items-center text-xs text-gray-400 bg-white/5 p-2 rounded">
                      <div className="flex space-x-3">
                        <span>📄 {partition.file_count} archivos</span>
                        <span>📁 {partition.directory_count} directorios</span>
                      </div>
                      <div className="flex space-x-2">
                        {partition.has_users && (
                          <span className="bg-yellow-800/50 text-yellow-300 px-2 py-1 rounded">
                            👥 users.txt
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {partition.status === 'error' && (
                    <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                      ❌ {partition.error_message || 'Error desconocido'}
                    </div>
                  )}
                  
                  {partition.status === 'empty' && (
                    <div className="mt-2 text-xs text-gray-400 bg-gray-900/20 p-2 rounded">
                      📁 Partición vacía - Sin contenido
                    </div>
                  )}
                </div>
              ))}
              
              {scanData.results.length === 0 && (
                <div className="text-center py-12">
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-yellow-200 mb-3">
                      🔍 No se encontraron particiones montadas
                    </h4>
                    <p className="text-sm text-yellow-200 mb-4">
                      Asegúrate de tener particiones montadas antes de usar el escaneo global
                    </p>
                    <button
                      onClick={() => navigate("/management")}
                      className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-lg transition"
                    >
                      Ir a Gestión de Particiones
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-1/3 bg-black/10 border-l border-white/20 p-4 overflow-y-auto">
          {selectedPartition ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">📂 {selectedPartition.partition_id}</h3>
                <button
                  onClick={closeDetails}
                  className="text-gray-400 hover:text-white transition text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-purple-300">📋 Información General</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Disco:</span> 
                      <span className="text-white">{selectedPartition.disk_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estado:</span> 
                      <span className={`font-semibold ${
                        selectedPartition.status === 'success' ? 'text-green-400' :
                        selectedPartition.status === 'empty' ? 'text-gray-400' : 'text-red-400'
                      }`}>
                        {selectedPartition.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Archivos:</span> 
                      <span className="text-white">{selectedPartition.file_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Directorios:</span> 
                      <span className="text-white">{selectedPartition.directory_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sistema de usuarios:</span> 
                      <span className={selectedPartition.has_users ? 'text-green-400' : 'text-gray-400'}>
                        {selectedPartition.has_users ? `Sí (${selectedPartition.user_count} usuarios)` : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedPartition.files && selectedPartition.files.length > 0 && (
                  <div className="bg-white/5 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 text-purple-300">📁 Archivos y Carpetas</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedPartition.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {file.type === 'directory' ? '📁' : '📄'}
                            </span>
                            <div>
                              <span className="text-gray-300 font-medium">{file.name}</span>
                              {file.name === 'users.txt' && (
                                <span className="ml-2 text-xs bg-yellow-800/50 text-yellow-300 px-2 py-1 rounded">
                                  Sistema
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded ${
                              file.type === 'directory' 
                                ? 'bg-blue-800/50 text-blue-300' 
                                : 'bg-green-800/50 text-green-300'
                            }`}>
                              {file.type === 'directory' ? 'DIR' : 'FILE'}
                            </span>
                            {file.type === 'file' && (
                              <div className="text-xs text-gray-500 mt-1">{file.size}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white/5 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-purple-300">⚡ Acciones</h4>
                  <div className="space-y-2">
                    {selectedPartition.status === 'success' && (
                      <button
                        onClick={() => navigateToPartition(selectedPartition.partition_id)}
                        className="w-full bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition flex items-center justify-center space-x-2"
                      >
                        <span>🔍</span>
                        <span>Explorar Partición</span>
                      </button>
                    )}
                    
                    <button
                      onClick={fetchGlobalScan}
                      className="w-full bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition flex items-center justify-center space-x-2"
                    >
                      <span>🔄</span>
                      <span>Reescanear Todo</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🌍</div>
              <h3 className="text-lg font-semibold mb-2">Vista Global del Sistema</h3>
              <p className="text-sm mb-4">
                Selecciona una partición de la lista para ver sus detalles completos
              </p>
              <div className="bg-white/5 p-4 rounded-lg text-left">
                <h4 className="font-semibold mb-2">💡 Características:</h4>
                <ul className="text-xs space-y-1">
                  <li>• Escanea todas las particiones montadas</li>
                  <li>• Muestra archivos y directorios</li>
                  <li>• Detecta sistema de usuarios automáticamente</li>
                  <li>• Permite navegación directa a particiones</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
