import type {
  SerialDataChunk,
  SerialPortSummary,
  SerialServiceCallbacks,
  SerialSettings,
} from '../types/serial.types'

type DisconnectEventLike = Event & { port?: SerialPort }

class SerialService {
  private port: SerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private keepReading = false
  private isManualDisconnect = false
  private callbacks: SerialServiceCallbacks | null = null
  private decoder = new TextDecoder()

  constructor() {
    if (this.isSupported()) {
      navigator.serial.addEventListener('disconnect', this.handlePortDisconnect)
    }
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator
  }

  async getGrantedPort() {
    if (!this.isSupported()) {
      return null
    }

    const ports = await navigator.serial.getPorts()
    const [firstPort] = ports
    if (firstPort) {
      this.port = firstPort
    }

    return firstPort ?? null
  }

  async requestPort() {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not available in this browser.')
    }

    const port = await navigator.serial.requestPort()
    this.port = port
    return port
  }

  describePort(port = this.port): SerialPortSummary {
    if (!port) {
      return { label: 'No serial port selected' }
    }

    const info = port.getInfo()
    const vendor = info.usbVendorId ? this.toHex(info.usbVendorId) : '----'
    const product = info.usbProductId ? this.toHex(info.usbProductId) : '----'

    return {
      label:
        info.usbVendorId || info.usbProductId
          ? `USB Serial ${vendor}:${product}`
          : 'USB Serial Device',
      usbVendorId: info.usbVendorId,
      usbProductId: info.usbProductId,
    }
  }

  async connect(settings: SerialSettings, callbacks: SerialServiceCallbacks) {
    if (!this.port) {
      throw new Error('Select a serial port before connecting.')
    }

    if (this.port.readable || this.port.writable) {
      await this.disconnect()
    }

    this.callbacks = callbacks
    this.isManualDisconnect = false
    this.decoder = new TextDecoder()

    await this.port.open({
      baudRate: settings.baudRate,
      dataBits: settings.dataBits,
      stopBits: settings.stopBits,
      parity: settings.parity,
      flowControl: settings.flowControl,
      bufferSize: 4096,
    })

    if (!this.port.readable) {
      throw new Error('The selected port does not expose a readable stream.')
    }

    this.keepReading = true
    this.reader = this.port.readable.getReader()
    void this.readLoop()
  }

  async disconnect() {
    this.keepReading = false
    this.isManualDisconnect = true

    try {
      if (this.reader) {
        await this.reader.cancel()
      }
    } catch {
      // Ignore cancellation errors during teardown.
    } finally {
      this.reader?.releaseLock()
      this.reader = null
    }

    if (this.port) {
      try {
        await this.port.close()
      } catch {
        // Ignore close errors during teardown.
      }
    }

    this.isManualDisconnect = false
  }

  async send(payload: string) {
    if (!this.port?.writable) {
      throw new Error('Connect to a serial port before sending data.')
    }

    const writer = this.port.writable.getWriter()
    const data = new TextEncoder().encode(payload)

    try {
      await writer.write(data)
      return data.byteLength
    } finally {
      writer.releaseLock()
    }
  }

  isSelectionCanceled(error: unknown) {
    return error instanceof DOMException && error.name === 'NotFoundError'
  }

  formatError(error: unknown, fallback: string) {
    if (error instanceof DOMException) {
      if (error.name === 'SecurityError') {
        return 'Serial access is blocked. Open the app from localhost or HTTPS and try again.'
      }

      if (error.name === 'NetworkError') {
        return 'The device became unavailable while the serial connection was active.'
      }

      if (error.name === 'InvalidStateError') {
        return 'The selected serial port is already open or in an invalid state.'
      }

      if (error.name === 'NotFoundError') {
        return 'No serial port was selected.'
      }

      return error.message || fallback
    }

    if (error instanceof Error) {
      return error.message || fallback
    }

    return fallback
  }

  private async readLoop() {
    try {
      while (this.keepReading && this.reader) {
        const { value, done } = await this.reader.read()

        if (done) {
          break
        }

        if (!value || value.byteLength === 0) {
          continue
        }

        const chunk: SerialDataChunk = {
          text: this.decoder.decode(value, { stream: true }),
          bytes: value.byteLength,
        }

        this.callbacks?.onData(chunk)
      }

      const trailingText = this.decoder.decode()
      if (trailingText) {
        this.callbacks?.onData({ text: trailingText, bytes: 0 })
      }
    } catch (error) {
      if (this.keepReading) {
        this.callbacks?.onError(this.formatError(error, 'Unable to read from the serial device.'), error)
      }
    } finally {
      this.reader?.releaseLock()
      this.reader = null
      this.keepReading = false

      if (!this.isManualDisconnect) {
        try {
          await this.port?.close()
        } catch {
          // Ignore close errors after an unexpected disconnect.
        }

        this.callbacks?.onDisconnect()
      }
    }
  }

  private handlePortDisconnect = (event: Event) => {
    const disconnectedPort = (event as DisconnectEventLike).port

    if (!disconnectedPort || disconnectedPort !== this.port || this.isManualDisconnect) {
      return
    }

    this.keepReading = false
    this.callbacks?.onDisconnect()
  }

  private toHex(value: number) {
    return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`
  }
}

export const serialService = new SerialService()
