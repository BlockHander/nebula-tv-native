// ─────────────────────────────────────────────────
// Nebula TV — Local Pairing Server
//
// Runs a minimal HTTP server on the Android TV device
// so the user can pair their phone (on the same LAN)
// without typing a token on the TV remote.
//
// Flow:
//   1. TV generates a short pairing code (e.g. "X7K3PQ")
//   2. TV starts an HTTP server on port 8888
//   3. TV shows the code + IP + QR code (QR encodes TV's URL)
//   4. User scans QR → phone opens TV pairing page
//   5. User enters their Nebula token on the phone web page
//   6. Phone POSTs the token to the TV
//   7. TV validates and stores the token
//   8. UI reacts to token being received
// ─────────────────────────────────────────────────

import TcpServer, { Socket as TcpSocket } from 'react-native-tcp-socket';
import Network from 'expo-network';

// ── Pairing Code ────────────────────────────────
// Excludes ambiguous chars: 0/O, 1/I/L, 5/S, 8/B

const CODE_CHARS = '234679ACDEFGHJKMNPQRTUVWXYZ';
const CODE_LENGTH = 6;

export function generatePairingCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// ── IP Detection ────────────────────────────────

/**
 * Get the primary LAN IP address (192.168.x.x).
 *
 * Strategy:
 *   1. expo-network → fast, native WiFi IP
 *   2. Socket trick  → connects a TCP socket to 8.8.8.8:53
 *      without sending data. The OS binds to the correct
 *      local interface, then we read socket.localAddress.
 */
function getLocalIpViaSocket(timeoutMs = 3000): Promise<string> {
  return new Promise((resolve) => {
    let settled = false;
    const socket: any = new (TcpSocket as any)();

    const done = (ip: string) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      resolve(ip);
    };

    const timer = setTimeout(() => done('0.0.0.0'), timeoutMs);

    socket.on('connect', () => {
      const addr = socket.address?.() || {};
      const ip = addr.address || socket.localAddress || '';
      clearTimeout(timer);
      done(ip && ip !== '127.0.0.1' ? ip : '0.0.0.0');
    });

    socket.on('error', () => {
      clearTimeout(timer);
      done('0.0.0.0');
    });

    try {
      socket.connect({ host: '8.8.8.8', port: 53, connectTimeout: timeoutMs });
    } catch {
      clearTimeout(timer);
      done('0.0.0.0');
    }
  });
}

export async function getLocalIp(): Promise<string> {
  // Method 1: expo-network (fast, uses Android WifiManager)
  try {
    const ip = await Network.getIpAddressAsync();
    if (ip && ip !== '0.0.0.0' && ip !== '127.0.0.1') {
      return ip;
    }
  } catch {
    // Fall through to socket method
  }

  // Method 2: Socket trick — connect to a public DNS to discover local IP
  try {
    const ip = await getLocalIpViaSocket();
    if (ip !== '0.0.0.0') return ip;
  } catch {
    // Fall through to default
  }

  return '0.0.0.0';
}

// ── HTTP Response Builder ───────────────────────

const CRLF = '\r\n';

/** Approximate byte length of a UTF-8 string (ASCII fast path). */
function byteLength(str: string): number {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    const cp = str.charCodeAt(i);
    if (cp < 0x80) len += 1;
    else if (cp < 0x800) len += 2;
    else if (cp < 0xd800 || cp >= 0xe000) len += 3;
    else { i++; len += 4; }
  }
  return len;
}

function httpResponse(
  status: number,
  statusText: string,
  body: string,
  contentType = 'text/html; charset=utf-8',
  extraHeaders: Record<string, string> = {},
): string {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': String(byteLength(body)),
    Connection: 'close',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extraHeaders,
  };
  const headerLines = Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join(CRLF);
  return `HTTP/1.1 ${status} ${statusText}${CRLF}${headerLines}${CRLF}${CRLF}${body}`;
}

function htmlPage(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #030712; color: #f8fafc;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .card {
      background: #0f172a; border: 1px solid #1e293b; border-radius: 24px;
      padding: 40px 32px; max-width: 440px; width: 100%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #f1f5f9; text-align: center; }
    .subtitle { font-size: 15px; color: #94a3b8; text-align: center; margin-bottom: 28px; line-height: 1.5; }
    .code-display {
      font-size: 42px; font-weight: 900; letter-spacing: 10px; text-align: center;
      color: #60a5fa; background: rgba(59,130,246,0.08);
      border: 2px dashed #3b82f6; border-radius: 16px; padding: 20px; margin-bottom: 24px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    label { display: block; font-size: 14px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    input[type="text"], input[type="password"] {
      width: 100%; padding: 16px; border-radius: 12px; border: 2px solid #334155;
      background: #1e293b; color: #f1f5f9; font-size: 18px; font-weight: 500;
      font-family: 'SF Mono', 'Fira Code', monospace; letter-spacing: 1px;
      outline: none; transition: border-color 0.2s; margin-bottom: 16px;
    }
    input:focus { border-color: #3b82f6; }
    button {
      width: 100%; padding: 18px; border-radius: 12px; border: none;
      background: #2563eb; color: #fff; font-size: 18px; font-weight: 700;
      cursor: pointer; transition: background 0.2s, transform 0.1s;
    }
    button:hover { background: #1d4ed8; }
    button:active { transform: scale(0.98); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .message { margin-top: 16px; padding: 12px; border-radius: 10px; text-align: center; font-size: 15px; display: none; }
    .error { display: block; background: rgba(239,68,68,0.12); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
    .success { display: block; background: rgba(34,197,94,0.12); color: #86efac; border: 1px solid rgba(34,197,94,0.3); }
    .info { display: block; background: rgba(59,130,246,0.08); color: #93c5fd; border: 1px solid rgba(59,130,246,0.2); }
    .footer { margin-top: 20px; font-size: 13px; color: #475569; text-align: center; }
    .step { font-size: 14px; color: #64748b; margin-bottom: 20px; line-height: 1.6; padding: 16px; background: rgba(15,23,42,0.5); border-radius: 12px; }
    .step strong { color: #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

// ── Pairing Page HTML (served at GET /) ─────────

function pairingPage(code: string): string {
  return htmlPage(
    'Pair with Nebula TV',
    `
      <h1>🔗 Pair Your TV</h1>
      <p class="subtitle">Enter your Nebula API token to connect your TV</p>
      <div class="step">
        <strong>Step 1:</strong> Open nebula.tv in your browser and log in.<br>
        <strong>Step 2:</strong> Open Developer Tools (F12) → Console tab.<br>
        <strong>Step 3:</strong> Type <strong>__NEBULA_DEV_TOKEN__</strong> and press Enter.<br>
        <strong>Step 4:</strong> Copy the token that appears.
      </div>
      <label>TV Pairing Code</label>
      <div class="code-display">${code}</div>
      <label>Your API Token</label>
      <input type="password" id="token" placeholder="Paste your token here" autocomplete="off" autocorrect="off" spellcheck="false" />
      <button id="submitBtn" onclick="submitPair()">Connect TV</button>
      <div id="message" class="message"></div>
      <p class="footer">Make sure your phone is on the same Wi-Fi network as your TV</p>
    `,
  );
}

// ── Inject JavaScript to handle form POST ──────

const PAIR_JS = `
<script>
async function submitPair() {
  const token = document.getElementById('token').value.trim();
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('message');

  if (!token) {
    msg.className = 'message error';
    msg.textContent = 'Please enter your API token';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Connecting...';
  msg.className = 'message info';
  msg.textContent = 'Sending token to your TV...';

  try {
    const res = await fetch('/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'token=' + encodeURIComponent(token),
    });
    const text = await res.text();
    if (res.ok) {
      msg.className = 'message success';
      msg.innerHTML = '✅ TV connected successfully!<br>You can close this page.';
      btn.disabled = true;
      btn.textContent = 'Connected ✓';
    } else {
      msg.className = 'message error';
      msg.textContent = text || 'Failed to connect. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Try Again';
    }
  } catch (e) {
    msg.className = 'message error';
    msg.textContent = 'Could not reach the TV. Make sure both devices are on the same network.';
    btn.disabled = false;
    btn.textContent = 'Try Again';
  }
}
</script>
`;

// ── Success Page ────────────────────────────────

const SUCCESS_PAGE = htmlPage(
  'Connected!',
  `
    <h1>✅ Connected!</h1>
    <p class="subtitle">Your TV is now linked to your Nebula account.<br>You can safely close this page.</p>
    <div style="text-align:center;font-size:64px;margin:24px 0;">📺</div>
    <p class="footer">Enjoy watching on your TV</p>
  `,
);

// ── GET /status JSON ────────────────────────────

function statusJson(paired: boolean, pairedToken: string): string {
  return JSON.stringify({ paired, token: paired ? pairedToken : null });
}

// ── Pairing Server ──────────────────────────────

export interface PairingServerInstance {
  code: string;
  port: number;
  start: (host?: string) => Promise<number>;       // returns port, binds to given host
  stop: () => void;
  getToken: () => string | null;
  isPaired: () => boolean;
  reset: () => void;
}

export function createPairingServer(
  onTokenReceived?: (token: string) => void,
): PairingServerInstance {
  let server: any = null;
  let token: string | null = null;
  let paired = false;
  let buf = '';
  const code = generatePairingCode();

  function reset(): void {
    token = null;
    paired = false;
    buf = '';
  }

  function handleRequest(sock: any, requestText: string): void {
    const lines = requestText.split(CRLF);
    const requestLine = lines[0] || '';
    const parts = requestLine.split(' ');
    const method = parts[0] || 'GET';
    const path = parts[1] || '/';

    // Find the body (after double CRLF)
    const bodyStart = requestText.indexOf(CRLF + CRLF);
    let body = '';
    if (bodyStart !== -1) {
      body = requestText.slice(bodyStart + 4).trim();
    }

    // ── CORS Preflight ──
    if (method === 'OPTIONS') {
      sock.write(httpResponse(204, 'No Content', ''));
      sock.end();
      return;
    }

    // ── GET / — Pairing page ──
    if (method === 'GET' && (path === '/' || path.startsWith('/pair/'))) {
      const page = pairingPage(code) + PAIR_JS;
      sock.write(httpResponse(200, 'OK', page));
      sock.end();
      return;
    }

    // ── GET /status — JSON status ──
    if (method === 'GET' && path === '/status') {
      sock.write(
        httpResponse(200, 'OK', statusJson(paired, token || ''), 'application/json'),
      );
      sock.end();
      return;
    }

    // ── POST /pair — Receive token ──
    if (method === 'POST' && path === '/pair') {
      const params = new URLSearchParams(body);
      const receivedToken = params.get('token') || '';

      if (!receivedToken || receivedToken.length < 8) {
        sock.write(
          httpResponse(400, 'Bad Request', 'Invalid token. Please enter your full Nebula API token.'),
        );
        sock.end();
        return;
      }

      token = receivedToken;
      paired = true;
      onTokenReceived?.(receivedToken);

      sock.write(httpResponse(200, 'OK', SUCCESS_PAGE));
      sock.end();
      return;
    }

    // ── 404 ──
    sock.write(httpResponse(404, 'Not Found', htmlPage('Not Found', '<h1>404</h1><p class="subtitle">Page not found</p>')));
    sock.end();
  }

  return {
    code,
    port: 8888,
    async start(host = '0.0.0.0'): Promise<number> {
      return new Promise((resolve, reject) => {
        try {
          const bindHost = host && host !== '0.0.0.0' ? host : '0.0.0.0';

          server = TcpServer.createServer((sock: any) => {
            let clientBuf = '';

            sock.on('data', (data: Buffer | string) => {
              const chunk = typeof data === 'string' ? data : data.toString('utf8');
              clientBuf += chunk;

              // Check if we have a complete HTTP request
              const headerEnd = clientBuf.indexOf(CRLF + CRLF);
              if (headerEnd !== -1 && !clientBuf.includes('__request_handled__')) {
                // Mark handled to prevent re-processing
                clientBuf += '__request_handled__';
                handleRequest(sock, clientBuf.replace('__request_handled__', ''));
              }
            });

            sock.on('error', (err: Error) => {
              console.warn('[NebulaPair] Socket error:', err.message);
            });
          });

          server.on('error', (err: Error) => {
            console.error('[NebulaPair] Server error:', err.message);
            reject(err);
          });

          server.listen({ port: 8888, host: bindHost }, () => {
            console.log(`[NebulaPair] Server listening on ${bindHost}:8888`);
            resolve(8888);
          });
        } catch (err) {
          reject(err);
        }
      });
    },
    stop(): void {
      try {
        server?.close();
      } catch {}
      server = null;
      reset();
    },
    getToken: () => token,
    isPaired: () => paired,
    reset,
  };
}
