export type SerialParity = 'none' | 'even' | 'odd'
export type SerialFlowControl = 'none' | 'hardware'
export type SerialLineEnding = 'none' | 'newline' | 'carriage-return' | 'crlf'
export type SerialConnectionState =
  | 'unsupported'
  | 'idle'
  | 'port-selected'
  | 'connecting'
  | 'connected'
  | 'disconnecting'

export type MonitorDirection = 'rx' | 'tx' | 'system'

export interface SerialSettings {
  baudRate: number
  dataBits: 7 | 8
  stopBits: 1 | 2
  parity: SerialParity
  flowControl: SerialFlowControl
}

export interface MonitorEntry {
  id: string
  direction: MonitorDirection
  text: string
  timestamp: string
  timestampLabel: string
  complete: boolean
}

export interface SerialPortSummary {
  label: string
  usbVendorId?: number
  usbProductId?: number
}

export interface SerialDataChunk {
  text: string
  bytes: number
}

export interface SerialServiceCallbacks {
  onData: (chunk: SerialDataChunk) => void
  onDisconnect: () => void
  onError: (message: string, error?: unknown) => void
}
