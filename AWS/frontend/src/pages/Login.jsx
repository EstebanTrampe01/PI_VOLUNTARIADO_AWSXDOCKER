import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    idParticion: "",
    user: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/session`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          console.log("Sesión activa detectada, redirigiendo...");
          navigate("/management");
        }
      }
    } catch (err) {
      console.log("No hay sesión activa previa");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!formData.idParticion || !formData.user || !formData.password) {
      setError("Todos los campos son requeridos");
      setIsLoading(false);
      return;
    }

    try {
      console.log(" Intentando login...", { 
        user: formData.user, 
        partition: formData.idParticion 
      });

      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        
        localStorage.setItem('mia_session', JSON.stringify(data.session));
        
        navigate("/management");
      } else {
        console.log("Login falló:", data.error);
        setError(data.error || "Credenciales inválidas");
      }
    } catch (err) {
      console.error("Error en login:", err);
      setError("Error de conexión con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] flex items-center justify-center p-4">

      <nav className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 py-4">
        <Link to="/" className="text-2xl font-bold text-white hover:text-gray-300 transition">
          ← HOME/CONSOLA 🐰🐢
        </Link>
      </nav>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20">

        <div className="w-full flex justify-center -mt-20 mb-4">
          <img
            src="https://pbs.twimg.com/media/EvEJxT5XMAAAlcC.jpg:large"
            alt="Logo"
            className="w-29 h-28 rounded-full border-4 border-white shadow-lg object-cover"
          />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Iniciar Sesión</h1>
          <p className="text-gray-300">Ingresa tus credenciales para acceder al explorador</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="idParticion" className="block text-sm font-medium text-gray-200 mb-2">
              ID de Partición
            </label>
            <input
              type="text"
              id="idParticion"
              name="idParticion"
              value={formData.idParticion}
              onChange={handleInputChange}
              placeholder="Ej: A103"
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 mt-1">
              ID de la partición montada (ej: A103, B201)
            </p>
          </div>

          <div>
            <label htmlFor="user" className="block text-sm font-medium text-gray-200 mb-2">
              Usuario
            </label>
            <input
              type="text"
              id="user"
              name="user"
              value={formData.user}
              onChange={handleInputChange}
              placeholder="Turtle"
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Rabbi"
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 disabled:transform-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verificando credenciales...
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-400 text-sm">
            <Link to="/" className="text-blue-400 hover:text-blue-300 transition">
              Ir a la Consola
            </Link>
          </p>
          
          <div className="text-xs text-gray-500"></div>
            Backend: <span className="text-green-400">{API_BASE_URL} </span>
          </div>
        </div>
      </div>
  );
}
