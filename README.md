# Mayormono

Asistente personal para macOS con acceso a Microsoft 365 via IA.

## ¿Qué es?

Mayormono es una app de escritorio para macOS que combina Claude (via SAP HAI) con acceso a tus datos de Microsoft 365: calendario, correo, tareas, Teams, OneDrive y SharePoint. Puedes preguntarle por tus reuniones, leer emails, buscar documentos o revisar chats — todo desde una interfaz de chat conversacional.

El acceso a M365 es **sólo lectura** — Mayormono no puede enviar emails, crear eventos ni escribir en Teams.

## Stack

- **Electron 35** + **electron-vite** + **React 18** — app de escritorio macOS
- **@anthropic-ai/sdk** — cliente para la API de Claude (proxy SAP HAI en `http://localhost:6655`)
- **microsoft-365-mcp** — servidor MCP (FastMCP/Python) que expone herramientas de Microsoft Graph API via stdio
- **marked** — renderizado de markdown en las respuestas

## Instalación desde el DMG

1. Descarga `Mayormono-1.0.0-arm64.dmg` desde [Releases](https://github.com/javierdonoso88/mayormono/releases)
2. Abre el DMG y arrastra **Mayormono.app** a la carpeta Aplicaciones
3. Primera vez: macOS bloqueará la app por falta de firma de Apple Developer. Ve a **Ajustes del Sistema → Privacidad y Seguridad → Abrir igualmente**
4. Al abrir la app, el onboarding te guiará para configurar tu nombre, API Key y conectar Microsoft 365

## Configurar Microsoft 365

La app incluye los binarios MCP empaquetados, pero el token de autenticación hay que generarlo una vez:

```bash
# 1. Instala uv si no lo tienes
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Instala microsoft-365-mcp
uv tool install microsoft-365-mcp

# 3. Autentícate (abre el navegador para OAuth)
microsoft-365-mcp-auth
```

El token se guarda en el Keychain de macOS. Caduca a los 90 días sin uso; la app te avisará con un banner y te pedirá reconectar.

### Herramientas disponibles

| Categoría | Herramientas |
|-----------|-------------|
| Calendario | `outlook_list_events`, `outlook_get_event`, `outlook_find_meeting_times` |
| Correo | `outlook_list_messages`, `outlook_get_message`, `outlook_mail_summary` |
| Tareas | `outlook_list_task_lists`, `outlook_list_tasks` |
| Teams | `teams_list_chats`, `teams_get_chat`, `teams_list_messages`, `teams_search_messages` |
| Contactos | `contacts_list`, `contacts_search` |
| OneDrive | `onedrive_list_files`, `onedrive_search`, `onedrive_recent_files`, `onedrive_get_file_content`, `onedrive_search_transcripts` |
| SharePoint | `sharepoint_list_sites`, `sharepoint_get_site`, `sharepoint_list_pages`, `sharepoint_get_page`, `sharepoint_search_pages`, `sharepoint_list_lists`, `sharepoint_get_list_items` |

## Desarrollo

```bash
git clone https://github.com/javierdonoso88/mayormono.git
cd mayormono
npm install
npm run dev
```

> **Nota OneDrive:** Si el proyecto está en una carpeta de OneDrive, npm no puede extraer el binario de Electron. Solución:
> ```bash
> mkdir -p ~/.electron-dist
> # Extrae el binario de node_modules/electron/dist a ~/.electron-dist
> ln -s ~/.electron-dist node_modules/electron/dist
> ```

El script `npm run dev` incluye `ELECTRON_RUN_AS_NODE=` para limpiar la variable que Claude Code setea y que rompe el arranque de Electron.

## Generar el DMG

```bash
npm run dist
# Genera: release/Mayormono-1.0.0-arm64.dmg
# El build se hace en /tmp para evitar que OneDrive corrompa la firma de la app
```

La app se firma con una identidad ad-hoc (`codesign --sign -`) para que macOS no la muestre como "dañada". Los receptores necesitan hacer clic en "Abrir igualmente" en Ajustes del Sistema la primera vez.

## Configuración

La configuración se guarda en `~/Library/Application Support/mayormono/settings.json`. Accesible desde el icono ⚙️ en la app.

| Campo | Por defecto | Descripción |
|-------|-------------|-------------|
| `userName` | — | Nombre con el que Mayormono se dirige a ti |
| `apiKey` | — | API Key del proxy SAP HAI |
| `baseURL` | `http://localhost:6655/anthropic` | Endpoint de la API |
| `model` | `claude-sonnet-4-5` | Modelo de Claude |

## Estructura del proyecto

```
src/
├── main/
│   └── index.js      # MCPClient, IPC handlers, Claude API loop
├── preload/
│   └── index.js      # Expone mayormonoAPI via contextBridge
└── renderer/
    └── src/
        ├── App.jsx   # UI: chat, onboarding, configuración
        └── index.css # Tema oscuro púrpura
resources/
├── bin/              # Binarios MCP empaquetados (PyInstaller)
│   ├── microsoft-365-mcp
│   ├── microsoft-365-mcp-auth
│   └── microsoft-365-mcp-whoami
└── icon.icns
build/
└── afterPack.js      # Hook post-build: firma ad-hoc + limpieza de xattrs
```

## Notas

- Los links externos (SharePoint, Teams, Outlook web) se abren en el navegador por defecto
- Las respuestas se renderizan en markdown
- Si el MCP no está conectado, la app muestra un banner de aviso y bloquea las respuestas inventadas
- No apto para datos de clientes (ver aviso de cumplimiento en el README del servidor MCP)
