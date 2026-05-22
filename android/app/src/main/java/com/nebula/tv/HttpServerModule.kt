package com.nebula.tv

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.ServerSocket
import java.net.URLDecoder
import kotlin.concurrent.thread

class HttpServerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var serverSocket: ServerSocket? = null
    private var running = false
    private var pairingCode: String = ""
    private var promiseFulfilled = false

    override fun getName(): String = "NebulaHttpServer"

    @ReactMethod
    fun start(port: Int, code: String, promise: Promise) {
        if (running) {
            promise.resolve(port)
            return
        }
        pairingCode = code
        running = true
        promiseFulfilled = false

        thread(isDaemon = true, name = "nebula-http-server") {
            try {
                serverSocket = ServerSocket(port)
                val actualPort = serverSocket!!.localPort
                Log.i(TAG, "HTTP server started on port $actualPort")

                reactApplicationContext.runOnUiQueueThread {
                    if (!promiseFulfilled) {
                        promiseFulfilled = true
                        promise.resolve(actualPort)
                    }
                }

                while (running && !serverSocket!!.isClosed) {
                    try {
                        val client = serverSocket!!.accept()
                        handleClient(client)
                    } catch (e: Exception) {
                        if (running) Log.w(TAG, "Accept: ${e.message}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Server error: ${e.message}")
                reactApplicationContext.runOnUiQueueThread {
                    if (!promiseFulfilled) {
                        promiseFulfilled = true
                        promise.reject("SERVER_ERROR", e.message)
                    }
                }
                running = false
            }
        }
    }

    @ReactMethod
    fun stop() {
        running = false
        try { serverSocket?.close() } catch (_: Exception) {}
        serverSocket = null
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(running)
    }

    @ReactMethod
    fun addListener(eventName: String) {}
    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun handleClient(client: java.net.Socket) {
        try {
            client.use { socket ->
                val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
                val requestLine = reader.readLine() ?: return
                val parts = requestLine.split(" ")
                if (parts.size < 2) return
                val method = parts[0]
                val path = parts[1].substringBefore("?") // strip query params

                var contentLength = 0
                while (true) {
                    val line = reader.readLine() ?: break
                    if (line.isEmpty()) break
                    if (line.lowercase().startsWith("content-length:")) {
                        contentLength = line.substringAfter(":").trim().toIntOrNull() ?: 0
                    }
                }

                var body = ""
                if ((method == "POST") && contentLength > 0) {
                    val buf = CharArray(contentLength)
                    val read = reader.read(buf, 0, contentLength)
                    if (read > 0) body = String(buf, 0, read)
                }

                when {
                    method == "GET" && path == "/" -> sendResponse(socket, 200, "text/html; charset=utf-8", HTML_PAGE)
                    method == "POST" && (path == "/submit" || path == "/api/pair") -> handleSubmit(socket, body)
                    method == "OPTIONS" -> sendResponse(socket, 200, "text/plain", "OK")
                    else -> sendResponse(socket, 404, "text/plain", "Not Found")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Client: ${e.message}")
        }
    }

    private fun handleSubmit(socket: java.net.Socket, body: String) {
        val params = parseFormBody(body)
        val code = params["code"]?.trim() ?: ""
        val token = params["token"]?.trim() ?: ""

        if (code != pairingCode) {
            sendResponse(socket, 403, "application/json", """{"ok":false,"error":"Invalid pairing code"}""")
            return
        }
        if (token.isEmpty()) {
            sendResponse(socket, 400, "application/json", """{"ok":false,"error":"Token is required"}""")
            return
        }

        Log.i(TAG, "Pairing successful!")
        val event = Arguments.createMap()
        event.putString("token", token)
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("NebulaPairingToken", event)

        sendResponse(socket, 200, "application/json", """{"ok":true,"message":"Connected! Close this page."}""")

        // Auto-stop
        running = false
        try { serverSocket?.close() } catch (_: Exception) {}
    }

    private fun sendResponse(socket: java.net.Socket, status: Int, contentType: String, body: String) {
        val statusText = when (status) { 200 -> "OK"; 400 -> "Bad Request"; 403 -> "Forbidden"; 404 -> "Not Found"; else -> "Unknown" }
        val response = "HTTP/1.1 $status $statusText\r\nContent-Type: $contentType\r\nContent-Length: ${body.toByteArray().size}\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\n\r\n$body"
        try { socket.getOutputStream().write(response.toByteArray()); socket.getOutputStream().flush() } catch (_: Exception) {}
    }

    private fun parseFormBody(body: String): Map<String, String> {
        val params = mutableMapOf<String, String>()
        try { body.split("&").forEach { pair -> val eq = pair.indexOf('='); if (eq > 0) { params[URLDecoder.decode(pair.substring(0, eq), "UTF-8")] = URLDecoder.decode(pair.substring(eq + 1), "UTF-8") } } } catch (_: Exception) {}
        return params
    }

    companion object {
        private const val TAG = "NebulaHttpServer"
        private val HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>NebulaTV Pairing</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#030712;color:#f9fafb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#111827;border-radius:20px;padding:40px 32px;width:100%;max-width:420px;border:1px solid #1f2937;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .logo{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#7c3aed,#3b82f6);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;font-weight:800;color:#fff}
  h1{text-align:center;font-size:24px;font-weight:700;margin-bottom:4px}
  .subtitle{text-align:center;color:#9ca3af;font-size:14px;margin-bottom:28px}
  .code-display{background:#1f2937;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:24px}
  .code-display span{font-size:13px;color:#9ca3af;display:block;margin-bottom:4px}
  .code-display strong{font-size:32px;letter-spacing:6px;color:#60a5fa;font-family:monospace}
  label{display:block;font-size:13px;font-weight:600;color:#d1d5db;margin-bottom:6px}
  input{width:100%;padding:14px 16px;border-radius:12px;border:1px solid #374151;background:#1f2937;color:#f9fafb;font-size:16px;outline:none;transition:border-color .2s;margin-bottom:16px}
  input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.2)}
  input::placeholder{color:#6b7280}
  .hint{font-size:12px;color:#6b7280;margin-bottom:20px;line-height:1.5}
  button{width:100%;padding:16px;border-radius:12px;border:none;background:#3b82f6;color:#fff;font-size:17px;font-weight:600;cursor:pointer;transition:background .2s,transform .1s}
  button:hover{background:#2563eb}
  button:active{transform:scale(.98)}
  button:disabled{background:#374151;color:#6b7280;cursor:not-allowed}
  .status{text-align:center;margin-top:16px;padding:12px;border-radius:10px;font-size:14px;display:none}
  .status.success{display:block;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.3);color:#4ade80}
  .status.error{display:block;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#f87171}
  .spinner{display:none;width:20px;height:20px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;margin:0 auto}
  .spinner.show{display:block}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="card">
  <div class="logo">N</div>
  <h1>NebulaTV</h1>
  <p class="subtitle">Connect to your Android TV</p>
  <div class="code-display"><span>Pairing Code</span><strong id="pairingCode">------</strong></div>
  <label for="tokenInput">Nebula API Token</label>
  <input type="text" id="tokenInput" placeholder="Paste your token here..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
  <div class="hint">Find your token in nebula.tv DevTools &rarr; Network &rarr; find <strong>users.api.nebula.app</strong> &rarr; copy <strong>Authorization</strong> header value after &quot;Token &quot;</div>
  <button id="submitBtn" onclick="submitToken()"><span id="btnText">Connect to TV</span><div class="spinner" id="spinner"></div></button>
  <div class="status" id="status"></div>
</div>
<script>
(function(){var c=new URLSearchParams(window.location.search).get('code')||'';document.getElementById('pairingCode').textContent=c})();
async function submitToken(){
  var t=document.getElementById('tokenInput').value.trim();
  if(!t){showStatus('Enter your Nebula API token','error');return}
  var b=document.getElementById('submitBtn'),s=document.getElementById('spinner'),bt=document.getElementById('btnText');
  b.disabled=true;s.className='spinner show';bt.style.display='none';showStatus('','');
  try{
    var c=new URLSearchParams(window.location.search).get('code')||'',f=new URLSearchParams();f.set('code',c);f.set('token',t);
    var r=await fetch('/submit',{method:'POST',body:f}),d=await r.json();
    if(d.ok){showStatus(d.message||'Connected!','success');bt.textContent='Connected';bt.style.display='block';s.className='spinner'}
    else{showStatus(d.error||'Failed','error');b.disabled=false;s.className='spinner';bt.style.display='block'}
  }catch(e){showStatus('Same Wi-Fi network? Could not reach TV.','error');b.disabled=false;s.className='spinner';bt.style.display='block'}
}
function showStatus(m,t){var e=document.getElementById('status');e.textContent=m;e.className='status '+t}
</script>
</body>
</html>"""
    }
}
