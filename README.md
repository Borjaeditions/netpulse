# NetPulse

**NetPulse** es una aplicación de código abierto para monitorear la velocidad de conexión a Internet desde un panel web. Permite ejecutar pruebas manuales, programar mediciones automáticas y consultar resultados históricos.

> **Estado:** v0.1.0 — primera versión funcional, orientada a redes privadas de confianza.

## Características

- Pruebas manuales de descarga, subida, ping y jitter mediante LibreSpeed CLI.
- Pruebas automáticas por intervalos o días y horarios definidos.
- Historial persistente en SQLite y gráficas por periodos.
- Actualización de resultados mediante Server-Sent Events (SSE).
- Interfaz React adaptable, con temas claro y oscuro.
- Despliegue de frontend y API mediante Docker Compose.

## Requisitos

- Docker Engine y Docker Compose (`docker compose`).
- Acceso a Internet desde el servidor para realizar mediciones.
- Puerto TCP **8086** disponible en el anfitrión (o modificarlo en `compose.yaml`).

No es necesario instalar Node.js en el servidor cuando se usa Docker.

## Instalación

```bash
git clone https://github.com/Borjaeditions/netpulse.git
cd netpulse
docker compose up -d --build
```

Abre `http://IP_DEL_SERVIDOR:8086` en tu navegador. En el mismo equipo, utiliza `http://localhost:8086`.

Para revisar el estado:

```bash
docker compose ps
docker compose logs -f
curl http://localhost:8086/api/health
```

### Cambiar el puerto

En el servicio `web` de `compose.yaml`, cambia:

```yaml
ports:
  - "8086:80"
```

Por ejemplo, para usar el puerto 8090: `"8090:80"`. Después ejecuta `docker compose up -d`.

### Actualizar

```bash
git pull --ff-only
docker compose up -d --build
```

### Detener

```bash
docker compose down
```

**No borres la carpeta `data/` si deseas conservar el historial.**

## Persistencia

La base de datos SQLite se almacena en `./data/netpulse.db`, mediante el montaje `./data:/app/data` del servicio API. Para respaldarla, detén temporalmente los servicios antes de copiar los archivos de `data/`, o utiliza un método de respaldo compatible con SQLite en modo WAL.

## Arquitectura

```text
Navegador :8086
    |
    v
Nginx (contenedor web)
    |-- React/Vite (archivos estáticos)
    |-- /api/*
    v
Fastify (contenedor api :3100, sin puerto publicado)
    |-- LibreSpeed CLI
    |-- Programador y SSE
    v
SQLite (./data/netpulse.db)
```

Nginx sirve el panel y actúa como proxy de las rutas `/api`.

## Desarrollo

Requiere Node.js **24 o superior** y npm.

```bash
git clone https://github.com/Borjaeditions/netpulse.git
cd netpulse
npm ci
npm run build:api
npm run build:web
```

Para ejecutar en desarrollo, abre dos terminales:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Si la API se ejecuta en otro equipo, revisa el proxy configurado en Vite.

## Seguridad y limitaciones de v0.1.0

**No expongas NetPulse directamente a Internet en esta versión.**

- No hay autenticación de usuarios.
- Cualquier cliente con acceso al servidor web puede invocar rutas `/api`, incluidas las que ejecutan pruebas, administran programaciones o eliminan registros. Que la API esté detrás de Nginx **no garantiza que las solicitudes provengan del panel React**.
- Los endpoints de eliminación existen, pero todavía falta integrarlos en la interfaz web.
- La configuración predeterminada `8086:80` escucha en todas las interfaces del anfitrión: restringe el acceso mediante firewall o cambia el enlace del puerto según tu red.
- Para permitir acceso solo desde el equipo anfitrión, usa `127.0.0.1:8086:80` en el servicio `web`.

NetPulse está pensado inicialmente para entornos privados de confianza. Las instalaciones compartidas o públicas necesitarán controles de acceso adicionales.

## Tecnologías

React, TypeScript, Vite, Recharts, Node.js, Fastify, LibreSpeed CLI, SQLite, Nginx y Docker Compose.

## Hoja de ruta

- [x] Pruebas manuales y programadas.
- [x] Historial, gráficas y SSE.
- [x] Interfaz web adaptable y temas claro/oscuro.
- [x] Frontend y API en Docker.
- [x] Endpoints de eliminación de registros.
- [ ] Eliminación de registros desde el panel.
- [ ] Autenticación para instalaciones compartidas.
- [ ] Pruebas y documentación adicionales para la versión estable.

## Licencia

MIT
---

Desarrollado por [Borjaeditions](https://github.com/Borjaeditions).
