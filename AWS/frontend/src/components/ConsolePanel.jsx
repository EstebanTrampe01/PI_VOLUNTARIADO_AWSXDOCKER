import { useState } from "react";
import { API_BASE_URL } from "../config/api";

export default function ConsolePanel() {
  const [command, setCommand] = useState("");
  const [outputs, setOutputs] = useState([
    "Sistema iniciado...",
    `Conectado al backend: ${API_BASE_URL}`,
    "Respuesta de los comandos"
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCommand = async () => {
    if (command.trim()) {
      setOutputs(prev => [...prev, `> ${command}`]);
      setIsLoading(true);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/execute-command`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ command: command.trim() })
        });
        
        const result = await response.json();
        console.log('Command result:', result);
        
        if (result.success) {
          setOutputs(prev => [...prev, result.output]);
        } else {
          setOutputs(prev => [...prev, `Error: ${result.error || 'Comando falló'}`]);
          if (result.output) {
            setOutputs(prev => [...prev, result.output]);
          }
        }
        
      } catch (error) {
        console.error(' Command error:', error);
        setOutputs(prev => [...prev, `Error de conexión: ${error.message}`]);
        setOutputs(prev => [...prev, `Verificar que el backend esté ejecutándose en ${API_BASE_URL}`]);
      }
      
      setCommand("");
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendCommand();
    }
  };

  const clearConsole = () => {
    setOutputs(["Consola limpiada", "Listo para recibir comandos"]);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <h2 className="text-3xl font-bold text-center mb-4">Consola de Comandos</h2>
      
      <div className="flex-grow flex space-x-4">
        <div className="w-1/2 bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-xl font-semibold mb-3">Entrada de Comandos</h3>
          <div className="space-y-3">
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu comando aquí... &#10;Ejemplos:&#10;mkdisk -size=100 -unit=m&#10;fdisk -size=50 -driveletter=A -name=Part1"
              className="w-full h-32 bg-gray-800/50 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:border-blue-500 focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSendCommand}
              disabled={!command.trim() || isLoading}
              className={`w-full py-2 rounded-lg transition ${
                isLoading 
                  ? "bg-gray-600 cursor-not-allowed" 
                  : "bg-blue-500 hover:bg-blue-400"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ejecutando...
                </span>
              ) : (
                "Ejecutar Comando"
              )}
            </button>
            
            <div className="text-xs text-gray-400">
              <p className="font-medium mb-1">Orden de ejecución:</p>
              <button 
                onClick={() => setCommand("mkdisk -size=100 -unit=m")}
                className="block text-blue-400 hover:text-blue-300 mb-1"
              >
                mkdisk -size=15 -unit=m
              </button>
              <button 
                onClick={() => setCommand("fdisk -size=50 -driveletter=A -name=Part1")}
                className="block text-blue-400 hover:text-blue-300"
              >
                fdisk -size=50 -driveletter=A -name=Part1
              </button>
            </div>
          </div>
        </div>

        <div className="w-1/2 bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-xl font-semibold mb-3">Salida del Sistema</h3>
          <div className="bg-gray-900/50 rounded-lg p-3 h-[500px] overflow-y-auto font-mono text-sm">
            {outputs.map((output, index) => (
              <div key={index} className="mb-1 whitespace-pre-wrap">
                <span className={
                  output.startsWith('>') ? 'text-green-400 font-bold' : 
                  output.startsWith('❌') ? 'text-red-400' : 
                  output.startsWith('💡') ? 'text-yellow-400' :
                  output.includes('EXITOSAMENTE') || output.includes('exitoso') ? 'text-green-300' :
                  'text-gray-300'
                }>
                  {output}
                </span>
              </div>
            ))}
            
            <div style={{ float:"left", clear: "both" }}
                 ref={(el) => { el?.scrollIntoView(); }}>
            </div>
          </div>
          <button
            onClick={clearConsole}
            className="mt-3 w-full bg-red-500 hover:bg-red-400 py-1 text-sm rounded transition"
          >
            Limpiar Consola
          </button>
        </div>
      </div>
    </div>
  );
}
