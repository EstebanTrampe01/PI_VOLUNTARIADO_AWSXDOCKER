import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export default function Console() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentCommand, setCurrentCommand] = useState("");
  const [output, setOutput] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const outputRef = useRef(null);

  useEffect(() => {
    checkConnection();
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/session`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          setSessionInfo(data.session);
          addOutput({
            type: "info",
            content: `Sesión activa detectada: ${data.session.username} en partición ${data.session.partitionId}`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
    } catch (err) {
      console.log("No hay sesión activa");
    }
  };

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (response.ok) {
        setIsConnected(true);
        addOutput({
          type: "system",
          content: "Sistema iniciado...",
          timestamp: new Date().toLocaleTimeString()
        });
        addOutput({
          type: "system", 
          content: "Conectado al backend",
          timestamp: new Date().toLocaleTimeString()
        });
        addOutput({
          type: "system",
          content: "Listo para recibir comandos",
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (error) {
      setIsConnected(false);
      addOutput({
        type: "error",
        content: "Error: No se pudo conectar al backend",
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const goToFileManager = () => {
    if (sessionInfo) {
      navigate("/management");
    } else {
      addOutput({
        type: "error",
        content: "Error: Debe iniciar sesión primero para acceder al explorador de archivos",
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleLogout = async () => {
    if (!sessionInfo) {
      addOutput({
        type: "error",
        content: "Error: No hay sesión activa para cerrar",
        timestamp: new Date().toLocaleTimeString()
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionInfo(null);
        localStorage.removeItem('mia_session');
        addOutput({
          type: "success",
          content: ` ${data.message}`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      addOutput({
        type: "error",
        content: "Error al cerrar sesión",
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const addOutput = (newOutput) => {
    setOutput(prev => [...prev, newOutput]);
  };

  const executeCommand = async () => {
    if (!currentCommand.trim()) return;
    if (!isConnected) {
      addOutput({
        type: "error",
        content: "Error: No hay conexión con el backend",
        timestamp: new Date().toLocaleTimeString()
      });
      return;
    }

    addOutput({
      type: "command",
      content: `> ${currentCommand}`,
      timestamp: new Date().toLocaleTimeString()
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/execute-command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: currentCommand }),
      });

      if (response.ok) {
        const data = await response.json();
        addOutput({
          type: data.success ? "success" : "error",
          content: data.output || data.error || "Comando ejecutado",
          timestamp: new Date().toLocaleTimeString()
        });

        if (data.success && currentCommand.toLowerCase().includes("login")) {
          setTimeout(checkActiveSession, 500);
        }

        if (data.success && currentCommand.toLowerCase().includes("logout")) {
          setSessionInfo(null);
        }
      } else {
        addOutput({
          type: "error",
          content: "Error del servidor",
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (error) {
      addOutput({
        type: "error",
        content: `Error de conexión: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    setCurrentCommand("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      executeCommand();
    }
  };

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const getOutputStyle = (type) => {
    switch (type) {
      case "command":
        return "text-cyan-400 font-medium";
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "system":
        return "text-gray-400";
      case "info":
        return "text-blue-400";
      default:
        return "text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] text-white">
      <div className="sticky top-0 z-10 border-b border-white/20 p-4 flex justify-between items-center bg-gradient-to-r from-[#0f172a]/95 to-[#1e1b4b]/95 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Consola 🐰🐢</h1>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}></div>
            <span>{isConnected ? "Conectado" : "Desconectado"}</span>
          </div>
          {sessionInfo && (
            <div className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-sm">
              👤 {sessionInfo.username} @ {sessionInfo.partitionId}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {sessionInfo && (
            <button
              onClick={goToFileManager}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition flex items-center space-x-2"
            >
              <span>📁</span>
              <span>Explorador</span>
            </button>
          )}
          {sessionInfo && (
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition"
            >
              Cerrar Sesión
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition"
          >
            Inicio
          </button>
        </div>
      </div>
      <div className="p-6 pb-20">
        <div className="bg-black/50 rounded-lg flex flex-col min-h-[calc(100vh-120px)]">
          <div className="bg-gray-800/50 px-4 py-2 rounded-t-lg border-b border-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="ml-4 text-gray-400 text-sm">Terminal</span>
            </div>
          </div>
          <div className="p-4 font-mono text-sm space-y-1 flex-grow">
            <div className="text-gray-400 border-b border-gray-700 pb-2 mb-4">
              <div className="text-lg font-bold">Manejo e Implementación de Archivos</div>
              <div className="text-sm">Proyecto 2 - Sistema de Archivos EXT2/EXT3</div>
              <div className="text-xs mt-2">Ejecución de comandos después de iniciar sesión.</div>
            </div>
            <div className="mb-4">
              <div className="text-cyan-400 font-medium mb-2">Salida del Sistema</div>
              {output.map((item, index) => (
                <div key={index} className={`${getOutputStyle(item.type)} whitespace-pre-wrap mb-1`}>
                  <span className="text-gray-500 text-xs mr-2">[{item.timestamp}]</span>
                  {item.content}
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 bg-black/50 backdrop-blur-sm p-2 rounded border-t border-gray-600">
              <div className="flex items-center">
                <span className="text-cyan-400 mr-2 select-none">$</span>
                <input
                  type="text"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-grow bg-transparent outline-none text-white font-mono placeholder-gray-500"
                  placeholder="Ingrese comando..."
                  disabled={!isConnected}
                  autoFocus
                />
                <div className="ml-3 flex items-center space-x-2">
                  {isConnected ? (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed inset-0 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] -z-10"></div>
    </div>
  );
}
