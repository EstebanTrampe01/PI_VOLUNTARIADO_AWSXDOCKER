# Iamgen bse oficial de Node.js
FROM node:18

# Creamos la carpeta DE TRABAJO
WORKDIR /app
# Copiamos el package.json y package-lock.json
COPY package*.json ./
# Instalamos las dependencias
RUN npm install
# Copiamos el resto del código de la aplicación
COPY . .
# Exponemos el puerto 4000
EXPOSE 4000
# Comando para iniciar la aplicación
CMD ["node", "index.js"]
