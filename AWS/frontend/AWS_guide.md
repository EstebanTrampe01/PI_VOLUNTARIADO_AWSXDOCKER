# 🚀 GUÍA COMPLETA: DEPLOYMENT A AWS - FRONTEND
### 🏭 **Scripts ORIGINALES de Vite (YA EXISTÍAN):**
```json
{
  "scripts": {
    "dev": "vite",              // Servidor desarrollo (localhost:5173)
    "build": "vite build",      // Build básico (usa .env por defecto)
    "lint": "eslint .",         // Revisar errores de código  
    "preview": "vite preview"   // Vista previa del build
  }
}
```

### ⭐ **Scripts para AWS:**
```json
{
  "scripts": {
    // ... scripts originales arriba ...
    
    "build:prod": "vite build --mode production",
    "deploy:prepare": "npm run build:prod && echo 'Build complete! Ready for S3 upload'",
    "deploy:info": "echo 'Upload the /dist/ folder to your S3 bucket'"
  }
}
```

## 🔍 **Explicación 3 scripts:**

### 1️⃣ `"build:prod": "vite build --mode production"`
```bash
# ¿Qué hace?
vite build --mode production
```
- 📖 **Lee** el archivo `.env.production` (no el .env normal)
- 🎯 **Activa** el modo producción de Vite
- 🗜️ **Minifica** todo el código al máximo
- 📦 **Crea** la carpeta `dist/` optimizada para AWS
- ⚡ **Optimiza** imágenes, CSS y JavaScript

### 2️⃣ `"deploy:prepare": "npm run build:prod && echo 'Build complete! Ready for S3 upload'"`
```bash
# ¿Qué hace? (comando compuesto)
npm run build:prod  &&  echo 'Build complete! Ready for S3 upload'
     ↑                        ↑
  Ejecuta build        Muestra mensaje de éxito
```
- 🚀 **Ejecuta** `build:prod` primero
- ✅ **Si** el build fue exitoso (&&), muestra mensaje
- 💡 **Útil** para automatizar y confirmar que todo salió bien

### 3️⃣ `"deploy:info": "echo 'Upload the /dist/ folder to your S3 bucket'"`
```bash
# ¿Qué hace?
echo 'Upload the /dist/ folder to your S3 bucket'
```
- 📢 **Solo** muestra un recordatorio en consola
- 🎓 **Educativo** - te recuerda qué hacer después del build
- 📁 **Te dice** exactamente qué carpeta subir a S3


### 🏗️ **LO QUE YA EXISTÍA (Vite automático):**
Cuando creas un proyecto React con Vite, este automáticamente te da:
```json
"scripts": {
  "dev": "vite",              // Desarrollo
  "build": "vite build",      // Build básico  
  "lint": "eslint .",         // Linter
  "preview": "vite preview"   // Preview
}
```

### ➕ **LO QUE SE AGREGÓ (Solo 3 líneas):**
```json
"build:prod": "vite build --mode production",
"deploy:prepare": "npm run build:prod && echo 'Build complete! Ready for S3 upload'",
"deploy:info": "echo 'Upload the /dist/ folder to your S3 bucket'"
```

## 🎯 **EL COMANDO PRINCIPAL:**
```bash
npm run build:prod
```

### **¿Qué hace este comando paso a paso?**
1. 📖 **Lee** el archivo `.env.production` (¡NO el .env normal!)
2. 🔄 **Compila** todo el código React con optimizaciones de producción
3. 🗜️ **Minifica** CSS y JavaScript (archivos más pequeños)
4. 📦 **Crea** la carpeta `dist/` optimizada para AWS
5. ✂️ **Divide** el código en chunks para mejor performance
6. 🌐 **Configura** las URLs para apuntar a tu backend de AWS

## 📁 **Archivos de Configuración:**

### 1. `.env.production` - Variables de Entorno
```bash
# 🌐 URL del backend en AWS EC2
VITE_API_BASE_URL=http://18.226.226.130:8080

# 📦 Modo producción
VITE_ENV=production
```

### 2. `vite.config.js` - Configuración de Build
- `outDir: 'dist'` ➡️ Carpeta de salida
- `sourcemap: false` ➡️ Sin mapas (archivos más pequeños)
- `manualChunks` ➡️ Optimización de carga
- `base: './'` ➡️ Rutas relativas para S3

## 🗂️ **Resultado del Build:**
```
dist/
├── index.html                    # 📄 Página principal
├── assets/
│   ├── index-[hash].css         # 🎨 Estilos minificados
│   ├── vendor-[hash].js         # 📚 React libraries
│   ├── router-[hash].js         # 🛣️ React Router
│   └── index-[hash].js          # 🚀 Tu código principal
```

## ☁️ **Subir a AWS S3:**
1. 📦 **Crear** bucket S3
2. 🌐 **Habilitar** Static Website Hosting
3. 📂 **Subir** TODO el contenido de `/dist/`
4. 🔗 **Configurar** CORS si es necesario

## 🧪 **DEMOSTRACIÓN PRÁCTICA para tu Taller:**


### 📺 **Paso 2: Ejecutar el comando mágico**
```bash
npm run build:prod
```

### 📺 **Paso 3: Mostrar el "DESPUÉS"**
```bash
# ¡Ahora sí existe!
ls -la dist/
# Aparece: index.html, assets/, etc.
```

### 📺 **Paso 4: Explicar la diferencia**
```bash
# Build normal (usa .env)
npm run build

# Build para AWS (usa .env.production)  
npm run build:prod
```

## 🎓 **Ideas para tu Taller:**
1. 🔄 **Mostrar** el antes y después del comando
2. 📁 **Abrir** la carpeta `dist/` y explicar cada archivo
3. 🔍 **Comparar** .env vs .env.production
4. 🌐 **Demostrar** cómo cambian las URLs en el código compilado
5. 📈 **Explicar** por qué los archivos son más pequeños en producción

### COMANDOS PARA INSTANCIA
COMANDOS PARA INSTANCIA
# 1. Conectar por SSH

# 2. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 3. Instalar Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Crear carpeta para el proyecto
mkdir -p ~/aws-backend
mkdir -p ~/aws-backend/disks

# Ir al directorio
cd ~/aws-backend

# SUBIR ARCHIVOS POR TERMIUS
A excepción del archivo 

# Solo estas 2 líneas:
export DISK_DIR=/home/ubuntu/aws-backend/disks/
export PORT=8080

# Ir al directorio
cd ~/aws-backend

# Instalar dependencias
go mod tidy

# Compilar
go build -o backend-api ./api/

# Ejecutar en background
nohup ./backend-api > backend.log 2>&1 &
