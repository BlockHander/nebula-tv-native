import { NativeModules, DeviceEventEmitter } from 'react-native'

const { NebulaHttpServer } = NativeModules

const EVENT_NAME = 'NebulaPairingToken'

export interface PairingServer {
  start(port: number, code: string): Promise<number>
  stop(): Promise<void>
  isRunning(): Promise<boolean>
}

/**
 * Start the local HTTP pairing server on the TV.
 * Returns the actual port number the server is listening on.
 */
export async function startPairingServer(
  port: number,
  code: string,
  onToken: (token: string) => void,
): Promise<number> {
  const listener = DeviceEventEmitter.addListener(
    EVENT_NAME,
    (event: { token: string }) => {
      if (event.token) {
        onToken(event.token)
        listener.remove()
      }
    },
  )

  const actualPort = await NebulaHttpServer.start(port, code)
  return actualPort as number
}

/**
 * Stop the pairing server.
 */
export async function stopPairingServer(): Promise<void> {
  DeviceEventEmitter.removeAllListeners(EVENT_NAME)
  try {
    await NebulaHttpServer.stop()
  } catch {
    // ignore
  }
}

/**
 * Check if the server is running.
 */
export async function isPairingServerRunning(): Promise<boolean> {
  try {
    const result = await NebulaHttpServer.isRunning()
    return result as boolean
  } catch {
    return false
  }
}
