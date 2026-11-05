
# Descargar y verificar LibreSpeed CLI
FROM alpine:3.22 AS librespeed

RUN apk add --no-cache ca-certificates curl tar

WORKDIR /tmp/librespeed

ARG LIBRESPEED_VERSION=1.0.14

RUN set -eu; \
    filename="librespeed-cli_${LIBRESPEED_VERSION}_linux_amd64.tar.gz"; \
    base="https://github.com/librespeed/speedtest-cli/releases/download/v${LIBRESPEED_VERSION}"; \
    curl -fL --retry 3 -o "$filename" "$base/$filename"; \
    curl -fL --retry 3 -o checksums.txt "$base/checksums.txt"; \
    grep "  $filename\$" checksums.txt | sha256sum -c -; \
    tar -xzf "$filename" librespeed-cli; \
    chmod 755 librespeed-cli

# Construir la API
FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

RUN npm ci

COPY apps/api ./apps/api

RUN npm run build -w @netpulse/api

# Incorporar LibreSpeed al contenedor
COPY --from=librespeed /tmp/librespeed/librespeed-cli /usr/local/bin/librespeed-cli

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

USER node

CMD ["node", "apps/api/dist/index.js"]
