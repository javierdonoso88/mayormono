const { spawn } = require('child_process')
const EventEmitter = require('events')
const os = require('os')
const path = require('path')

class MCPClient extends EventEmitter {
  constructor() {
    super()
    this.process = null
    this.pendingRequests = new Map()
    this.nextId = 1
    this.tools = []
    this.buffer = ''
    this.connected = false
  }

  async connect(command, args = []) {
    const homedir = os.homedir()
    const extraPaths = [
      path.join(homedir, '.local', 'bin'),
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin'
    ].join(':')

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('MCP connection timeout')), 15000)

      this.process = spawn(command, args, {
        env: {
          ...process.env,
          PATH: `${extraPaths}:${process.env.PATH || ''}`,
          FASTMCP_SHOW_SERVER_BANNER: 'false'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.process.stdout.on('data', (data) => {
        this.buffer += data.toString()
        const lines = this.buffer.split('\n')
        this.buffer = lines.pop()
        for (const line of lines) {
          if (line.trim()) {
            try {
              this.handleMessage(JSON.parse(line))
            } catch (_) {}
          }
        }
      })

      this.process.stderr.on('data', (d) => console.log('[MCP stderr]', d.toString()))
      this.process.on('error', (e) => { clearTimeout(timeout); reject(e) })
      this.process.on('close', () => { this.connected = false; this.emit('close') })

      this.request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'paco-asistente', version: '1.0.0' }
      })
        .then(() => {
          this.notify('notifications/initialized', {})
          return this.request('tools/list', {})
        })
        .then((result) => {
          clearTimeout(timeout)
          this.tools = result.tools || []
          this.connected = true
          resolve(this.tools)
        })
        .catch((e) => { clearTimeout(timeout); reject(e) })
    })
  }

  handleMessage(msg) {
    if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
      const { resolve, reject } = this.pendingRequests.get(msg.id)
      this.pendingRequests.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    }
  }

  request(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++
      this.pendingRequests.set(id, { resolve, reject })
      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params })
      this.process.stdin.write(msg + '\n')
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Timeout: ${method}`))
        }
      }, 30000)
    })
  }

  notify(method, params) {
    if (this.process) {
      this.process.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n')
    }
  }

  async callTool(name, args) {
    const result = await this.request('tools/call', { name, arguments: args })
    return result
  }

  disconnect() {
    if (this.process) {
      this.process.kill()
      this.process = null
      this.connected = false
    }
  }
}

module.exports = MCPClient
