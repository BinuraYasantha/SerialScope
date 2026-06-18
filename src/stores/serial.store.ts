import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { serialService } from '../services/serial.service'
import type {
  MonitorDirection,
  MonitorEntry,
  SerialConnectionState,
  SerialDataChunk,
  SerialLineEnding,
  SerialPortSummary,
  SerialSettings,
} from '../types/serial.types'

const baudRates = [2400, 4800, 9600, 19200, 31250, 38400, 57600, 74880, 115200, 230400, 250000]
const SERIAL_SETTINGS_STORAGE_KEY = 'serialscope-serial-settings'

const dataBitsOptions = [7, 8] as const
const stopBitsOptions = [1, 2] as const
const parityOptions = ['none', 'even', 'odd'] as const

interface PendingLine {
  direction: MonitorDirection
  text: string
  timestamp: string
  timestampLabel: string
}

interface StoredSerialSettings {
  baudRate: number
  dataBits: 7 | 8
  stopBits: 1 | 2
  parity: 'none' | 'even' | 'odd'
  lineEnding: SerialLineEnding
}

export const useSerialStore = defineStore('serial', () => {
  const persistedSettings = readStoredSerialSettings()

  const settings = reactive<SerialSettings>({
    baudRate: persistedSettings.baudRate,
    dataBits: persistedSettings.dataBits,
    stopBits: persistedSettings.stopBits,
    parity: persistedSettings.parity,
    flowControl: 'none',
  })

  const supported = ref(true)
  const supportMessage = ref('Ready to request a USB serial device from the browser.')
  const connectionState = ref<SerialConnectionState>('idle')
  const statusDetail = ref('Choose a port to begin.')
  const errorMessage = ref('')
  const selectedPort = ref<SerialPortSummary | null>(null)
  const entries = ref<MonitorEntry[]>([])
  const pendingLine = ref<PendingLine | null>(null)
  const pausedChunks = ref<SerialDataChunk[]>([])
  const commandInput = ref('')
  const commandHistory = ref<string[]>([])
  const historyCursor = ref(-1)
  const draftCommand = ref('')
  const lineEnding = ref<SerialLineEnding>(persistedSettings.lineEnding)
  const searchQuery = ref('')
  const autoScroll = ref(true)
  const timestampsEnabled = ref(true)
  const paused = ref(false)
  const rxBytes = ref(0)
  const txBytes = ref(0)

  watch(
    [
      () => settings.baudRate,
      () => settings.dataBits,
      () => settings.stopBits,
      () => settings.parity,
      () => settings.flowControl,
      lineEnding,
    ],
    () => {
      writeStoredSerialSettings({
        baudRate: settings.baudRate,
        dataBits: settings.dataBits,
        stopBits: settings.stopBits,
        parity: settings.parity,
        lineEnding: lineEnding.value,
      })
    },
    { immediate: true },
  )

  const statusLabel = computed(() => {
    switch (connectionState.value) {
      case 'unsupported':
        return 'Unsupported'
      case 'connecting':
        return 'Connecting'
      case 'connected':
        return 'Connected'
      case 'disconnecting':
        return 'Disconnecting'
      case 'port-selected':
        return 'Port Ready'
      default:
        return 'Disconnected'
    }
  })

  const statusTone = computed(() => {
    switch (connectionState.value) {
      case 'connected':
        return 'emerald'
      case 'connecting':
      case 'disconnecting':
        return 'amber'
      case 'unsupported':
        return 'rose'
      case 'port-selected':
        return 'sky'
      default:
        return 'slate'
    }
  })

  const selectedPortLabel = computed(() => selectedPort.value?.label ?? 'No port selected')
  const selectedPortMeta = computed(() => {
    if (!selectedPort.value) {
      return 'Use the browser chooser to grant access to a USB serial device.'
    }

    const details = [selectedPort.value.usbVendorId, selectedPort.value.usbProductId]
      .filter((value): value is number => typeof value === 'number')
      .map((value) => `0x${value.toString(16).toUpperCase().padStart(4, '0')}`)

    return details.length ? `Identifiers: ${details.join(' / ')}` : 'Generic serial device'
  })

  const displayEntries = computed(() => {
    const liveEntry = pendingLine.value
      ? [
          {
            id: 'pending-line',
            direction: pendingLine.value.direction,
            text: pendingLine.value.text,
            timestamp: pendingLine.value.timestamp,
            timestampLabel: pendingLine.value.timestampLabel,
            complete: false,
          } satisfies MonitorEntry,
        ]
      : []

    const combined = [...entries.value, ...liveEntry]

    if (!searchQuery.value.trim()) {
      return combined
    }

    const query = searchQuery.value.trim().toLowerCase()
    return combined.filter((entry) => {
      return (
        entry.text.toLowerCase().includes(query) ||
        entry.direction.toLowerCase().includes(query) ||
        entry.timestampLabel.toLowerCase().includes(query)
      )
    })
  })

  const canConnect = computed(() => supported.value && connectionState.value !== 'connecting' && connectionState.value !== 'connected')
  const canDisconnect = computed(() => connectionState.value === 'connected' || connectionState.value === 'connecting')
  const canSend = computed(() => connectionState.value === 'connected' && (commandInput.value.length > 0 || lineEnding.value !== 'none'))
  const queuedChunkCount = computed(() => pausedChunks.value.length)
  const totalVisibleLines = computed(() => displayEntries.value.length)
  const browserHint = computed(() => {
    return supported.value
      ? 'Requires a Chromium-based browser with Web Serial enabled.'
      : supportMessage.value
  })

  async function initialize() {
    supported.value = serialService.isSupported()

    if (!supported.value) {
      connectionState.value = 'unsupported'
      supportMessage.value = 'Web Serial is not available. Use Chrome, Edge, or another Chromium browser on localhost or HTTPS.'
      statusDetail.value = supportMessage.value
      return
    }

    try {
      const grantedPort = await serialService.getGrantedPort()
      if (grantedPort) {
        selectedPort.value = serialService.describePort(grantedPort)
        connectionState.value = 'port-selected'
        statusDetail.value = 'Previously granted serial device is ready.'
      }
    } catch (error) {
      errorMessage.value = serialService.formatError(error, 'Unable to read previously granted serial ports.')
    }
  }

  async function choosePort() {
    clearError()

    const portSelected = await requestAndStorePort()

    if (!portSelected) {
      return
    }

    await openConnection()
  }

  async function connect() {
    clearError()

    if (!selectedPort.value) {
      const portSelected = await requestAndStorePort()

      if (!portSelected) {
        return
      }
    }

    await openConnection()
  }

  async function openConnection(reason: 'connect' | 'settings-update' = 'connect') {
    if (!selectedPort.value) {
      errorMessage.value = 'Select a serial port before connecting.'
      statusDetail.value = 'No serial port selected.'
      connectionState.value = 'idle'
      return
    }

    const portLabel = selectedPort.value.label
    connectionState.value = 'connecting'
    statusDetail.value =
      reason === 'settings-update'
        ? `Applying ${formatConnectionProfile()} on ${portLabel}...`
        : `Opening ${portLabel} at ${settings.baudRate} baud...`

    try {
      await serialService.connect(settings, {
        onData: handleIncomingChunk,
        onDisconnect: handleDeviceDisconnect,
        onError: handleServiceError,
      })

      connectionState.value = 'connected'
      statusDetail.value = `Live at ${settings.baudRate} baud with ${settings.dataBits}${settings.parity === 'none' ? 'N' : settings.parity[0].toUpperCase()}${settings.stopBits}.`
      addSystemEntry(reason === 'settings-update' ? `Applied serial settings: ${formatConnectionProfile()}.` : `Connected to ${portLabel}.`)
    } catch (error) {
      connectionState.value = selectedPort.value ? 'port-selected' : 'idle'
      errorMessage.value = serialService.formatError(error, 'Unable to open the serial connection.')
      statusDetail.value = 'Connection failed.'
      addSystemEntry('Connection attempt failed.')
    }
  }

  async function requestAndStorePort() {
    try {
      const port = await serialService.requestPort()
      selectedPort.value = serialService.describePort(port)
      connectionState.value = 'port-selected'
      statusDetail.value = 'Serial port selected. Opening connection...'
      addSystemEntry(`Selected ${selectedPort.value.label}.`)
      return true
    } catch (error) {
      if (serialService.isSelectionCanceled(error)) {
        statusDetail.value = 'Serial port selection was canceled.'
        return false
      }

      errorMessage.value = serialService.formatError(error, 'Unable to request a serial port.')
      statusDetail.value = 'Port request failed.'
      return false
    }
  }

  async function disconnect() {
    clearError()
    connectionState.value = 'disconnecting'
    statusDetail.value = 'Closing serial connection...'

    try {
      await serialService.disconnect()
    } finally {
      flushPendingLine()
      connectionState.value = selectedPort.value ? 'port-selected' : 'idle'
      statusDetail.value = 'Serial connection closed.'
      addSystemEntry('Disconnected from serial device.')
    }
  }

  async function sendCommand() {
    if (!canSend.value) {
      return
    }

    const draft = commandInput.value
    const payload = appendLineEnding(draft, lineEnding.value)

    try {
      const bytesWritten = await serialService.send(payload)
      txBytes.value += bytesWritten
      addCompleteEntry('tx', draft)
      rememberCommand(draft)
      commandInput.value = ''
      historyCursor.value = -1
      draftCommand.value = ''
    } catch (error) {
      errorMessage.value = serialService.formatError(error, 'Unable to write to the serial device.')
      statusDetail.value = 'Write failed.'
    }
  }

  function stepHistory(direction: 'up' | 'down') {
    if (commandHistory.value.length === 0) {
      return
    }

    if (direction === 'up') {
      if (historyCursor.value === -1) {
        draftCommand.value = commandInput.value
        historyCursor.value = commandHistory.value.length - 1
      } else if (historyCursor.value > 0) {
        historyCursor.value -= 1
      }

      commandInput.value = commandHistory.value[historyCursor.value] ?? commandInput.value
      return
    }

    if (historyCursor.value === -1) {
      return
    }

    if (historyCursor.value < commandHistory.value.length - 1) {
      historyCursor.value += 1
      commandInput.value = commandHistory.value[historyCursor.value] ?? commandInput.value
      return
    }

    historyCursor.value = -1
    commandInput.value = draftCommand.value
  }

  function clearOutput() {
    entries.value = []
    pendingLine.value = null
    pausedChunks.value = []
  }

  function setSearchQuery(value: string) {
    searchQuery.value = value
  }

  function togglePause() {
    paused.value = !paused.value

    if (!paused.value) {
      const queued = [...pausedChunks.value]
      pausedChunks.value = []
      queued.forEach((chunk) => ingestText(chunk.text))
    }
  }

  function toggleAutoScroll() {
    autoScroll.value = !autoScroll.value
  }

  function toggleTimestamps() {
    timestampsEnabled.value = !timestampsEnabled.value
  }

  function buildLogText(filtered = true) {
    const sourceEntries = filtered ? displayEntries.value : [...entries.value, ...buildPendingEntry()]

    return sourceEntries
      .map((entry) => {
        const prefix = timestampsEnabled.value ? `[${entry.timestampLabel}] ` : ''
        const channel = entry.direction.toUpperCase().padEnd(6, ' ')
        return `${prefix}${channel}${entry.text}`
      })
      .join('\n')
  }

  function handleIncomingChunk(chunk: SerialDataChunk) {
    rxBytes.value += chunk.bytes

    if (paused.value) {
      pausedChunks.value.push(chunk)
      return
    }

    ingestText(chunk.text)
  }

  function handleDeviceDisconnect() {
    flushPendingLine()
    connectionState.value = selectedPort.value ? 'port-selected' : 'idle'
    errorMessage.value = 'The serial device disconnected.'
    statusDetail.value = 'The device was unplugged or the port closed unexpectedly.'
    addSystemEntry('Serial device disconnected unexpectedly.')
  }

  function handleServiceError(message: string) {
    errorMessage.value = message
    statusDetail.value = 'Serial communication error.'
    addSystemEntry(message)
  }

  function ingestText(text: string) {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    for (const character of normalized) {
      if (character === '\n') {
        commitPendingLine('rx')
        continue
      }

      if (!pendingLine.value) {
        pendingLine.value = createPendingLine('rx')
      }

      pendingLine.value.text += character
    }
  }

  function flushPendingLine() {
    if (pendingLine.value) {
      commitPendingLine(pendingLine.value.direction)
    }
  }

  function addSystemEntry(text: string) {
    addCompleteEntry('system', text)
  }

  function addCompleteEntry(direction: MonitorDirection, text: string) {
    const stamp = createPendingLine(direction)
    entries.value.push({
      id: createId(),
      direction,
      text,
      timestamp: stamp.timestamp,
      timestampLabel: stamp.timestampLabel,
      complete: true,
    })
  }

  function commitPendingLine(direction: MonitorDirection) {
    const line = pendingLine.value ?? createPendingLine(direction)

    entries.value.push({
      id: createId(),
      direction: line.direction,
      text: line.text,
      timestamp: line.timestamp,
      timestampLabel: line.timestampLabel,
      complete: true,
    })

    pendingLine.value = null
  }

  function buildPendingEntry() {
    if (!pendingLine.value) {
      return []
    }

    return [
      {
        id: 'pending-line',
        direction: pendingLine.value.direction,
        text: pendingLine.value.text,
        timestamp: pendingLine.value.timestamp,
        timestampLabel: pendingLine.value.timestampLabel,
        complete: false,
      } satisfies MonitorEntry,
    ]
  }

  function createPendingLine(direction: MonitorDirection): PendingLine {
    const date = new Date()

    return {
      direction,
      text: '',
      timestamp: date.toISOString(),
      timestampLabel: new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      }).format(date),
    }
  }

  function rememberCommand(command: string) {
    if (!command.length) {
      return
    }

    const lastCommand = commandHistory.value[commandHistory.value.length - 1]
    if (lastCommand === command) {
      return
    }

    commandHistory.value.push(command)

    if (commandHistory.value.length > 50) {
      commandHistory.value.shift()
    }
  }

  function appendLineEnding(command: string, ending: SerialLineEnding) {
    switch (ending) {
      case 'newline':
        return `${command}\n`
      case 'carriage-return':
        return `${command}\r`
      case 'crlf':
        return `${command}\r\n`
      default:
        return command
    }
  }

  function clearError() {
    errorMessage.value = ''
  }

  async function updateBaudRate(value: number) {
    if (settings.baudRate === value) {
      return
    }

    settings.baudRate = value
    await applyLiveSettings()
  }

  async function updateDataBits(value: 7 | 8) {
    if (settings.dataBits === value) {
      return
    }

    settings.dataBits = value
    await applyLiveSettings()
  }

  async function updateStopBits(value: 1 | 2) {
    if (settings.stopBits === value) {
      return
    }

    settings.stopBits = value
    await applyLiveSettings()
  }

  async function updateParity(value: 'none' | 'even' | 'odd') {
    if (settings.parity === value) {
      return
    }

    settings.parity = value
    await applyLiveSettings()
  }

  async function applyLiveSettings() {
    if (connectionState.value !== 'connected') {
      return
    }

    clearError()
    addSystemEntry(`Updating serial settings to ${formatConnectionProfile()}.`)
    await openConnection('settings-update')
  }

  function formatConnectionProfile() {
    const parityCode = settings.parity === 'none' ? 'N' : settings.parity[0].toUpperCase()

    return `${settings.baudRate} baud, ${settings.dataBits}${parityCode}${settings.stopBits}, no flow control`
  }

  function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
  }

  return {
    autoScroll,
    baudRates,
    browserHint,
    canConnect,
    canDisconnect,
    canSend,
    commandHistory,
    commandInput,
    connect,
    connectionState,
    dataBitsOptions,
    disconnect,
    displayEntries,
    errorMessage,
    historyCursor,
    initialize,
    lineEnding,
    parityOptions,
    paused,
    queuedChunkCount,
    rxBytes,
    searchQuery,
    selectedPortLabel,
    selectedPortMeta,
    sendCommand,
    setSearchQuery,
    settings,
    statusDetail,
    statusLabel,
    statusTone,
    stopBitsOptions,
    supportMessage,
    supported,
    stepHistory,
    timestampsEnabled,
    toggleAutoScroll,
    togglePause,
    toggleTimestamps,
    totalVisibleLines,
    txBytes,
    updateBaudRate,
    updateDataBits,
    updateParity,
    updateStopBits,
    buildLogText,
    choosePort,
    clearError,
    clearOutput,
  }
})

function readStoredSerialSettings(): StoredSerialSettings {
  const defaults: StoredSerialSettings = {
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    lineEnding: 'newline',
  }

  if (typeof window === 'undefined') {
    return defaults
  }

  try {
    const rawValue = window.localStorage.getItem(SERIAL_SETTINGS_STORAGE_KEY)
    if (!rawValue) {
      return defaults
    }

    const parsedValue = JSON.parse(rawValue) as Partial<StoredSerialSettings>

    return {
      baudRate: typeof parsedValue.baudRate === 'number' && baudRates.includes(parsedValue.baudRate) ? parsedValue.baudRate : defaults.baudRate,
      dataBits: parsedValue.dataBits === 7 || parsedValue.dataBits === 8 ? parsedValue.dataBits : defaults.dataBits,
      stopBits: parsedValue.stopBits === 1 || parsedValue.stopBits === 2 ? parsedValue.stopBits : defaults.stopBits,
      parity: parsedValue.parity && parityOptions.includes(parsedValue.parity) ? parsedValue.parity : defaults.parity,
      lineEnding:
        parsedValue.lineEnding &&
        ['none', 'newline', 'carriage-return', 'crlf'].includes(parsedValue.lineEnding)
          ? parsedValue.lineEnding
          : defaults.lineEnding,
    }
  } catch {
    return defaults
  }
}

function writeStoredSerialSettings(settings: StoredSerialSettings) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SERIAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}
