// 📦 CONFIGURACIÓN DE VITE PARA AWS DEPLOYMENT
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 🔧 Plugin de React - Necesario para que funcione React
  plugins: [react()],
  
  // 🚀 CONFIGURACIÓN ESPECIAL PARA BUILD DE PRODUCCIÓN
  build: {
    // 📂 Carpeta donde se genera el build (la que subes a S3)
    outDir: 'dist',
    
    // 🚫 No generar sourcemaps en producción (archivos más pequeños)
    sourcemap: false,
    
    // ⚡ OPTIMIZACIÓN AVANZADA - Divide el código en chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // 📚 Separa React en un archivo independiente (mejor cache)
          vendor: ['react', 'react-dom'],
          // 🛣️ Separa React Router en otro archivo
          router: ['react-router-dom']
        }
      }
    }
  },
  
  // 🖥️ Configuración del servidor de desarrollo (solo para localhost)
  server: {
    host: true,     // Permite acceso desde cualquier IP local
    port: 5173      // Puerto para desarrollo
  },
  
  // 🌐 Base path relativa (importante para S3)
  base: './'
})