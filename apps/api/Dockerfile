FROM node:24-bookworm-slim

WORKDIR /app

# Copiar manifiestos de npm workspaces
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Instalar dependencias reproducibles
RUN npm ci

# Copiar código del backend
COPY apps/api ./apps/api

# Compilar TypeScript
RUN npm run build -w @netpulse/api

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

USER node

CMD ["node", "apps/api/dist/index.js"]