// ─────────────────────────────────────────────────
// Nebula TV — Pairing HTTP Server (TCP-socket-based)
// Uses react-native-tcp-socket instead of a native
// module. Serves a self-contained HTML page for
// phone browsers, accepts token via POST /submit.
// ─────────────────────────────────────────────────

import TcpSocket from 'react-native-tcp-socket'
import * as Network from 'expo-network'

// ── Types ───────────────────────────────────────

type TokenCallback = (token: string) => void

interface ConnectionState {
  buffer: string
  requestLineParsed: boolean
  method: string
  path: string
  headers: Record<string, string>
  bodyStart: number
  contentLength: number
}

// ── Module State ───────────────────────────────

let server: TcpSocket.Server | null = null
let tokenCb: TokenCallback | null = null
let currentIp = ''
let currentPort = 0
let running = false

// ── HTML Page (self-contained, inline, minified) ─

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>Connect to Nebula TV</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background:#030712;color:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.container{width:100%;max-width:420px;background:#111827;border-radius:16px;border:1px solid #1f2937;padding:32px 24px;text-align:center}
.logo{font-size:28px;font-weight:700;letter-spacing:1px;margin-bottom:4px}
.subtitle{color:#9ca3af;font-size:14px;margin-bottom:28px;line-height:1.5}
.instruction{background:#1f2937;border-radius:10px;padding:14px 16px;margin-bottom:24px;text-align:left;font-size:13px;color:#d1d5db;line-height:1.6}
.instruction strong{color:#f9fafb}
.input-group{margin-bottom:20px;text-align:left}
.input-group label{display:block;font-size:13px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}
.input-group input{width:100%;background:#030712;border:1px solid #1f2937;border-radius:10px;padding:14px 16px;font-size:16px;color:#f9fafb;outline:none;transition:border-color .2s}
.input-group input:focus{border-color:#3b82f6}
.input-group input::placeholder{color:#6b7280}
.btn{width:100%;background:#3b82f6;border:none;border-radius:10px;padding:14px;font-size:16px;font-weight:600;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:opacity .2s;min-height:48px}
.btn:active{opacity:.8}
.btn:disabled{opacity:.6;cursor:default}
.spinner{display:inline-block;width:20px;height:20px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.feedback{margin-top:16px;padding:12px;border-radius:8px;font-size:14px;display:none}
.feedback.success{display:block;background:rgba(34,197,94,.1);border:1px solid #22c55e;color:#22c55e}
.feedback.error{display:block;background:rgba(239,68,68,.1);border:1px solid #ef4444;color:#ef4444}
.footer{color:#6b7280;font-size:11px;margin-top:24px}
</style>
</head>
<body>
<div class="container">
<div class="logo">Nebula TV</div>
<p class="subtitle">Pair with your Android TV</p>
<div class="instruction">
<strong>Step 1:</strong> Open <strong>nebula.tv</strong> in your browser<br>
<strong>Step 2:</strong> Open <strong>Developer Tools</strong> (F12 / Cmd+Option+I)<br>
<strong>Step 3:</strong> Go to the <strong>Console</strong> tab<br>
<strong>Step 4:</strong> Type <code style="background:rgba(59,130,246,.1);color:#60a5fa;padding:1px 4px;border-radius:3px">__NEBULA_DEV_TOKEN__</code> and press Enter<br>
<strong>Step 5:</strong> Copy the displayed token and paste it below
</div>
<div class="input-group">
<label for="token">API Token</label>
<input type="text" id="token" placeholder="Paste your token here" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
</div>
<button class="btn" id="submitBtn" onclick="submitToken()">Connect to Nebula</button>
<div id="feedback" class="feedback"></div>
<p class="footer">Nebula TV &mdash; Pairing Server</p>
</div>
<script>
var submitting=false;
function submitToken(){
if(submitting)return;
var token=document.getElementById('token').value.trim();
if(!token){showFeedback('Please enter your API token.','error');return}
submitting=true;
var btn=document.getElementById('submitBtn');
btn.disabled=true;
btn.innerHTML='<span class="spinner"></span>Connecting\u2026';
fetch('/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:token})})
.then(function(r){return r.json()})
.then(function(d){if(d.success){showFeedback('Connected! You can return to your TV.','success')}else{showFeedback(d.error||'Failed to connect.','error');resetBtn()}})
.catch(function(){showFeedback('Connection error. Make sure your phone is on the same Wi-Fi.','error');resetBtn()})
}
function showFeedback(msg,type){var el=document.getElementById('feedback');el.textContent=msg;el.className='feedback '+type}
function resetBtn(){submitting=false;var btn=document.getElementById('submitBtn');btn.disabled=false;btn.innerHTML='Connect to Nebula'}
</script>
</body>
</html>`

// ── Helpers ─────────────────────────────────────

/**
 * Naive UTF-8 byte length for ASCII-heavy strings.
 */
function byteLength(str: string): number {
  // For ASCII strings, length === byte count.
  // For safety, handle multi-byte chars.
  let len = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) len += 1
    else if (code < 0x800) len += 2
    else if (code < 0xd800 || code >= 0xe000) len += 3
    else {
      // surrogate pair
      i++
      len += 4
    }
  }
  return len
}

function httpResponse(
  statusCode: number,
  statusText: string,
  contentType: string,
  body: string,
  extraHeaders?: Record<string, string>,
): string {
  const headers: string[] = [
    `HTTP/1.1 ${statusCode} ${statusText}`,
    'Access-Control-Allow-Origin: *',
    'Access-Control-Allow-Methods: GET, POST, OPTIONS',
    'Access-Control-Allow-Headers: Content-Type',
    `Content-Type: ${contentType}`,
    `Content-Length: ${byteLength(body)}`,
    'Connection: close',
  ]
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.push(`${k}: ${v}`)
    }
  }
  return headers.join('\r\n') + '\r\n\r\n' + body
}

/**
 * Parse and handle a single HTTP connection.
 */
function handleConnection(socket: TcpSocket.Socket): void {
  const state: ConnectionState = {
    buffer: '',
    requestLineParsed: false,
    method: '',
    path: '',
    headers: {},
    bodyStart: 0,
    contentLength: 0,
  }

  socket.on('data', (chunk: string | Buffer) => {
    const text = typeof chunk === 'string' ? chunk : chunk.toString()
    state.buffer += text

    // ── Parse headers if not yet done ─────────
    if (!state.requestLineParsed) {
      const headerEnd = state.buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) return // need more data

      const headerSection = state.buffer.substring(0, headerEnd)
      const lines = headerSection.split('\r\n')

      // Request line: METHOD PATH HTTP/1.1
      if (lines.length > 0) {
        const parts = lines[0].split(' ')
        if (parts.length >= 2) {
          state.method = parts[0].toUpperCase()
          state.path = parts[1]
        }
      }

      // Headers
      for (let i = 1; i < lines.length; i++) {
        const ci = lines[i].indexOf(':')
        if (ci > 0) {
          const key = lines[i].substring(0, ci).trim().toLowerCase()
          const val = lines[i].substring(ci + 1).trim()
          state.headers[key] = val
        }
      }

      state.bodyStart = headerEnd + 4
      state.contentLength = parseInt(state.headers['content-length'] || '0', 10)
      state.requestLineParsed = true
    }

    // ── Check if we have the full body ────────
    const bodyReceived = state.buffer.length - state.bodyStart
    if (bodyReceived < state.contentLength) return // need more data

    // Parse body
    const body =
      state.contentLength > 0
        ? state.buffer.substring(
            state.bodyStart,
            state.bodyStart + state.contentLength,
          )
        : ''

    // ── Route the request ─────────────────────
    try {
      routeRequest(socket, state.method, state.path, state.headers, body)
    } catch {
      sendResponse(socket, 500, 'Internal Server Error', 'text/plain', 'Server error')
    }
  })

  socket.on('error', () => {
    // silently absorb socket errors
  })
}

/**
 * Route an HTTP request to the appropriate handler.
 */
function routeRequest(
  socket: TcpSocket.Socket,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: string,
): void {
  // ── CORS preflight ──────────────────────────
  if (method === 'OPTIONS') {
    sendResponse(socket, 204, 'No Content', 'text/plain', '', {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    })
    return
  }

  // ── GET / — Serve the pairing HTML page ────
  if (method === 'GET' && path === '/') {
    sendResponse(socket, 200, 'OK', 'text/html; charset=utf-8', HTML_PAGE)
    return
  }

  // ── POST /submit — Receive token from phone ─
  if (method === 'POST' && path === '/submit') {
    try {
      const contentType = (headers['content-type'] || '').toLowerCase()
      let token: string | undefined

      if (contentType.includes('application/json') || contentType.includes('text/plain')) {
        const parsed = JSON.parse(body)
        token = parsed?.token
      }

      if (token && typeof token === 'string' && token.trim().length > 0) {
        // Notify the app
        if (tokenCb) {
          tokenCb(token.trim())
        }
        sendResponse(
          socket,
          200,
          'OK',
          'application/json',
          JSON.stringify({ success: true }),
        )
      } else {
        sendResponse(
          socket,
          400,
          'Bad Request',
          'application/json',
          JSON.stringify({ error: 'Missing or invalid token' }),
        )
      }
    } catch {
      sendResponse(
        socket,
        400,
        'Bad Request',
        'application/json',
        JSON.stringify({ error: 'Invalid request body' }),
      )
    }
    return
  }

  // ── 404 — Everything else ───────────────────
  sendResponse(socket, 404, 'Not Found', 'text/plain', 'Not Found')
}

/**
 * Write an HTTP response and close the connection.
 */
function sendResponse(
  socket: TcpSocket.Socket,
  statusCode: number,
  statusText: string,
  contentType: string,
  body: string,
  extraHeaders?: Record<string, string>,
): void {
  try {
    const raw = httpResponse(statusCode, statusText, contentType, body, extraHeaders)
    socket.write(raw)
    socket.end()
  } catch {
    try {
      socket.destroy()
    } catch {
      // ignore
    }
  }
}

// ── Public API ─────────────────────────────────

/**
 * Start the local HTTP pairing server.
 *
 * Attempts to listen on the requested port; if that port is
 * unavailable it increments by 1 (up to +20 tries) before rejecting.
 *
 * Returns the actual IP and port the server is listening on.
 */
export async function startServer(
  preferredPort: number = 8080,
): Promise<{ port: number; ip: string }> {
  if (running) {
    return { port: currentPort, ip: currentIp }
  }

  // Get local WiFi IP
  const ip = await Network.getIpAddressAsync()
  currentIp = ip

  // Try the preferred port with fallback
  const maxAttempts = 20
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = preferredPort + attempt

    try {
      const actualPort = await startServerOnPort(port)
      currentPort = actualPort
      running = true
      return { port: actualPort, ip }
    } catch {
      // Try next port
      continue
    }
  }

  // Last resort: let the OS assign a random port
  try {
    const actualPort = await startServerOnPort(0)
    currentPort = actualPort
    running = true
    return { port: actualPort, ip }
  } catch (err) {
    running = false
    throw err
  }
}

/**
 * Internal: create a TCP server on a specific port.
 * Returns a promise that resolves with the port.
 */
function startServerOnPort(port: number): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const srv = TcpSocket.createServer()
    let settled = false

    srv.on('connection', (socket: TcpSocket.Socket) => {
      handleConnection(socket)
    })

    srv.on('error', (err: Error) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    })

    srv.listen({ port, host: '0.0.0.0' }, () => {
      if (!settled) {
        settled = true
        const addr = srv.address()
        const actualPort = addr && typeof addr === 'object' && 'port' in addr ? addr.port : port
        server = srv
        resolve(actualPort)
      }
    })
  })
}

/**
 * Stop the pairing server.
 */
export async function stopServer(): Promise<void> {
  if (!server) return
  return new Promise<void>((resolve) => {
    const srv = server!
    server = null
    running = false
    srv.close(() => {
      resolve()
    })
    // Force resolve after 3 seconds if close hangs
    setTimeout(() => resolve(), 3000)
  })
}

/**
 * Register a callback to be invoked when a token is received
 * from the phone browser.
 */
export function setTokenCallback(callback: TokenCallback): void {
  tokenCb = callback
}

/**
 * Get the server URL string (e.g. http://192.168.1.42:8080)
 * Returns empty string if server is not running.
 */
export function getServerUrl(): string {
  if (!running || !currentIp || !currentPort) return ''
  return `http://${currentIp}:${currentPort}`
}

/**
 * Check whether the pairing server is currently running.
 */
export function isRunning(): boolean {
  return running
}
