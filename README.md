# Mayormono

Asistente personal para macOS con acceso a Microsoft 365 via IA.

![Mayormono](resources/icon.icns)

## ¿Qué es?

Mayormono es una app de escritorio para macOS que combina un modelo de lenguaje (Claude via SAP HAI) con acceso a tus datos de Microsoft 365: calendario, correo, tareas y Teams. Puedes preguntarle por tus reuniones, leer emails, buscar documentos en SharePoint o revisar chats de Teams — todo desde una interfaz de chat.

## Stack

- **Electron 35** + **electron-vite** + **React 18** — app de escritorio macOS
- **@anthropic-ai/sdk** — cliente para la API de Claude (apuntando al proxy local SAP HAI)
- **microsoft-365-mcp** — servidor MCP local que expone herramientas de Microsoft Graph API
- **marked** — renderizado de markdown en las respuestas

## Requisitos

- macOS (Apple Silicon o Intel)
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) — gestor de paquetes Python
- Acceso a SAP HAI (proxy local en `http://localhost:6655`)

## Instalación desde el DMG

1. Descarga `Mayormono-1.0.0-arm64.dmg` desde [Releases](https://github.com/javierdonoso88/paco-asistente/releases)
2. Abre el DMG y arrastra **Mayormono.app** a la carpeta Applications
3. Primera vez: macOS bloqueará la app por falta de firma. Ve a **Ajustes del Sistema → Privacidad y Seguridad → Abrir igualmente**
4. Instala y autentica el MCP de Microsoft 365 (ver sección siguiente)

## Configurar Microsoft 365

La app necesita el servidor MCP para acceder a tus datos. Sólo hay que hacerlo una vez:

```bash
# 1. Instala uv si no lo tienes
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Instala el servidor MCP
cd /path/to/microsoft-365-mcp
uv tool install .

# 3. Autentícate con tu cuenta Microsoft (abre el navegador)
microsoft-365-mcp-auth
```

El token se guarda en el Keychain de macOS. No necesitas volver a autenticarte salvo que expire (90 días sin uso).

### Herramientas disponibles (29)

| Categoría | Herramientas |
|-----------|-------------|
| Calendario | `outlook_list_events`, `outlook_get_event`, `outlook_find_meeting_times` |
| Correo | `outlook_list_messages`, `outlook_get_message`, `outlook_mail_summary`, `outlook_list_mail_folders` |
| Tareas | `outlook_list_task_lists`, `outlook_list_tasks` |
| Teams | `teams_list_chats`, `teams_get_chat`, `teams_list_messages`, `teams_search_messages`, `teams_list_channels` |

## Desarrollo

```bash
# Clona el repositorio
git clone https://github.com/javierdonoso88/paco-asistente.git
cd paco-asistente

# Instala dependencias
npm install

# Arranca en modo desarrollo
npm run dev
```

> **Nota OneDrive:** Si el proyecto está en una carpeta de OneDrive, npm no puede extraer el binario de Electron. Solución: extrae el binario en `~/.electron-dist/` y crea un symlink:
> ```bash
> ln -s ~/.electron-dist node_modules/electron/dist
> ```

### Variables de entorno de desarrollo

El script `npm run dev` ya incluye `ELECTRON_RUN_AS_NODE=` para limpiar la variable que Claude Code setea automáticamente y que rompe el arranque de Electron.

## Configuración de la IA

La configuración se guarda en `~/Library/Application Support/mayormono/settings.json`. Desde la app: icono de engranaje (⚙️) en la esquina superior derecha.

| Campo | Por defecto | Descripción |
|-------|-------------|-------------|
| `userName` | `Javier` | Nombre que usa Mayormono para dirigirse a ti |
| `apiKey` | — | API Key del proxy SAP HAI |
| `baseURL` | `http://localhost:6655/anthropic` | Endpoint de la API |
| `model` | `claude-sonnet-4-5` | Modelo de Claude a usar |

## Generar el DMG

```bash
npm run dist
# Genera: release/Mayormono-1.0.0-arm64.dmg
```

## Estructura del proyecto

```
src/
├── main/          # Proceso principal Electron (Node.js)
│   └── index.js   # MCP client, IPC handlers, Claude API loop
├── preload/       # Bridge seguro renderer ↔ main
│   └── index.js   # Expone pacoAPI via contextBridge
└── renderer/      # UI React
    ├── index.html
    └── src/
        ├── App.jsx      # Componente de chat
        └── index.css    # Tema oscuro púrpura
resources/
└── icon.icns      # Icono de la app
```

## Notas

- Los links externos (SharePoint, Teams, Outlook web) se abren en el navegador por defecto
- Las respuestas de la IA se renderizan en markdown (negrita, listas, código)
- El acceso a M365 es de **sólo lectura** — Mayormono no puede enviar emails, crear eventos ni escribir en Teams
- No apto para uso productivo con datos de clientes (ver aviso de cumplimiento en el README del MCP)
