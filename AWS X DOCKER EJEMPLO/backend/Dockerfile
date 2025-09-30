# Usa una imagen oficial de Golang
FROM golang:1.22.2

# Crea el directorio de trabajo
WORKDIR /app

# Copia el código del monitor
COPY . .

# Compila el binario
RUN go build -o monitor

EXPOSE 8080


# Ejecuta el monitor al iniciar el contenedor
CMD ["./monitor"]



