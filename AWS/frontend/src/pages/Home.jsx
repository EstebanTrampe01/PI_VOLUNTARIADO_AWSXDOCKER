import { useState } from "react";
import { Link } from "react-router-dom";
import ConsolePanel from "../components/ConsolePanel";

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="h-screen bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] text-white flex flex-col">
      <nav className="flex justify-between items-center px-6 py-4 bg-transparent">
        <h1 className="text-2xl font-bold">MANEJO E IMPLEMENTACIÓN DE ARCHIVOS 🐰🐢</h1>
        <Link to="/login" className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl transition">
          Login
        </Link>
      </nav>

      <div className="flex justify-center mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1 flex space-x-1">
          <button
            onClick={() => setActiveTab("home")}
            className={`px-6 py-2 rounded-lg transition ${
              activeTab === "home"
                ? "bg-white text-[#1e1b4b] font-semibold"
                : "text-white hover:bg-white/20"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab("console")}
            className={`px-6 py-2 rounded-lg transition ${
              activeTab === "console"
                ? "bg-white text-[#1e1b4b] font-semibold"
                : "text-white hover:bg-white/20"
            }`}
          >
            Consola
          </button>
        </div>
      </div>

      <div className="flex-grow px-6 pb-6">
        {activeTab === "home" ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            
            <img
              src="https://pbs.twimg.com/media/EEuZwN8WwAE8NW6.jpg:large"
              alt="turtlerabbit"
              className="w-64 h-64 rounded-full object-cover border-4 border-purple shadow-lg"
            />
   
            <h2 className="text-4xl md:text-5xl font-bold">Bienvenido al Proyecto de Manejo de Archivos</h2>

            <p className="text-lg max-w-xl">
              Este sistema simula un sistema de archivos tipo EXT2/EXT3 con el uso de comandos por medio de consola.
              Puedes enviar comandos, iniciar sesión y explorar discos junto con sus particiones y poder navegar entre los archivos.
            </p>
            <p className="text-md text-gray-300">
              Usa la pestaña la consola para empezar a ejecutar comandos 
            </p>
          </div>
        ) : (
          <ConsolePanel />
        )}
      </div>
    </div>
  );
}
