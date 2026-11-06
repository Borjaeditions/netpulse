
# ==========================================
# NetPulse - Frontend Dockerfile
# React + Vite + Nginx
# ==========================================

# Etapa 1: Compilar el frontend
FROM node:24-alpine AS build

WORKDIR /app

# Copiar el proyecto completo para
# resolver los workspaces de npm.
COPY . .

# Instalar dependencias reproduciblemente
RUN npm ci

# Compilar React y Vite
RUN npm run build:web

# ==========================================
# Etapa 2: Servir la aplicación con Nginx
# ==========================================

FROM nginx:stable-alpine

# Configuración personalizada de Nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados de Vite
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
