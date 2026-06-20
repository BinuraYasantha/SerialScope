import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { serialService } from '../services/serial.service'
import type {
  MonitorDirection,
  MonitorEntry,
  SerialCommandPreset,
  SerialConnectionState,
  SerialDataChunk,
  SerialLineEnding,
  SerialPortSummary,
  SerialSettings,
  SerialUiNotice,
} from '../types/serial.types'

const baudRates = [2400, 4800, 9600, 19200, 31250, 38400, 57600, 74880, 115200, 230400, 250000]
const SERIAL_SETTINGS_STORAGE_KEY = 'serialscope-serial-settings'
const COMMAND_PRESETS_STORAGE_KEY = 'serialscope-command-presets'

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

interface ImportedCommandPresetsResult {
  importedCount: number
  skippedCount: number
}

export const useSerialStore = defineStore('serial', () => {
  const initialized = ref(false)
  const persistedSettings = readStoredSerialSettings()
  const persistedCommandPresets = readStoredCommandPresets()

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
  const presetNameInput = ref('')
  const commandHistory = ref<string[]>([])
  const commandPresets = ref<SerialCommandPreset[]>(persistedCommandPresets)
  const editingPresetId = ref<string | null>(null)
  const historyCursor = ref(-1)
  const draftCommand = ref('')
  const lineEnding = ref<SerialLineEnding>(persistedSettings.lineEnding)
  const uiNotice = ref<SerialUiNotice | null>(null)
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

  watch(
    commandPresets,
    (presets) => {
      writeStoredCommandPresets(presets)
    },
    { deep: true, immediate: true },
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
  const canSavePreset = computed(() => commandInput.value.trim().length > 0)
  const isEditingPreset = computed(() => editingPresetId.value !== null)
  const savePresetLabel = computed(() => (editingPresetId.value ? 'Update Preset' : 'Save Preset'))
  const queuedChunkCount = computed(() => pausedChunks.value.length)
  const totalVisibleLines = computed(() => displayEntries.value.length)
  const browserHint = computed(() => {
    return supported.value
      ? 'Requires a Chromium-based browser with Web Serial enabled.'
      : supportMessage.value
  })

  async function initialize() {
    if (initialized.value) {
      return
    }

    initialized.value = true
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

    try {
      await sendTextPayload(draft, lineEnding.value, true)
      commandInput.value = ''
      historyCursor.value = -1
      draftCommand.value = ''
    } catch (error) {
      errorMessage.value = serialService.formatError(error, 'Unable to write to the serial device.')
      statusDetail.value = 'Write failed.'
    }
  }

  async function saveCurrentCommandPreset() {
    if (!canSavePreset.value) {
      errorMessage.value = 'Type a command before saving a preset.'
      return
    }

    const commandName = presetNameInput.value.trim() || `Command ${commandPresets.value.length + 1}`
    const payload = buildTextPayload(commandInput.value, lineEnding.value)

    if (editingPresetId.value) {
      const index = commandPresets.value.findIndex((item) => item.id === editingPresetId.value)

      if (index !== -1) {
        const existingPreset = commandPresets.value[index]
        commandPresets.value.splice(index, 1, {
          ...existingPreset,
          name: commandName,
          payloadHex: bytesToHex(payload),
          commandText: commandInput.value,
          lineEnding: lineEnding.value,
          source: 'manual',
        })
      }

      setUiNotice('success', `Updated preset "${commandName}".`)
      addSystemEntry(`Updated command preset: ${commandName}.`)
      cancelEditCommandPreset()
      return
    }

    commandPresets.value.unshift({
      id: createId(),
      name: commandName,
      payloadHex: bytesToHex(payload),
      commandText: commandInput.value,
      lineEnding: lineEnding.value,
      source: 'manual',
    })

    presetNameInput.value = ''
    setUiNotice('success', `Saved preset "${commandName}".`)
    addSystemEntry(`Saved command preset: ${commandName}.`)
  }

  function loadCommandPreset(presetId: string) {
    const preset = commandPresets.value.find((item) => item.id === presetId)
    if (!preset) {
      return
    }

    commandInput.value = preset.commandText
    lineEnding.value = preset.lineEnding
    historyCursor.value = -1
    draftCommand.value = preset.commandText
  }

  async function sendCommandPreset(presetId: string) {
    const preset = commandPresets.value.find((item) => item.id === presetId)
    if (!preset) {
      return
    }

    try {
      await sendPreparedPayload(hexToBytes(preset.payloadHex), preset.commandText || `[${preset.name}]`, false)
      setUiNotice('success', `Sent preset "${preset.name}".`)
    } catch (error) {
      errorMessage.value = serialService.formatError(error, `Unable to send preset "${preset.name}".`)
      statusDetail.value = 'Write failed.'
    }
  }

  function deleteCommandPreset(presetId: string) {
    const preset = commandPresets.value.find((item) => item.id === presetId)
    if (!preset) {
      return
    }

    commandPresets.value = commandPresets.value.filter((item) => item.id !== presetId)
    if (editingPresetId.value === presetId) {
      cancelEditCommandPreset()
    }
    setUiNotice('info', `Removed preset "${preset.name}".`)
  }

  function beginEditCommandPreset(presetId: string) {
    const preset = commandPresets.value.find((item) => item.id === presetId)
    if (!preset) {
      return
    }

    editingPresetId.value = preset.id
    presetNameInput.value = preset.name
    commandInput.value = preset.commandText
    lineEnding.value = preset.lineEnding
    historyCursor.value = -1
    draftCommand.value = preset.commandText
  }

  function cancelEditCommandPreset() {
    editingPresetId.value = null
    presetNameInput.value = ''
  }

  function clearAllCommandPresets() {
    if (commandPresets.value.length === 0) {
      return
    }

    commandPresets.value = []
    cancelEditCommandPreset()
    setUiNotice('info', 'Cleared all saved command presets.')
    addSystemEntry('Cleared all saved command presets.')
  }

  async function importCommandPresetsFromXml(xmlText: string) {
    let importedCount = 0
    let skippedCount = 0

    try {
      const result = parseCommandPresetXml(xmlText)
      importedCount = result.importedCount
      skippedCount = result.skippedCount
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'The XML file could not be imported.'
      return
    }

    if (importedCount === 0) {
      errorMessage.value = skippedCount > 0 ? 'The XML file did not contain any new command presets to import.' : 'No valid command presets were found in the XML file.'
      return
    }

    const skippedMessage = skippedCount ? ` Skipped ${skippedCount} duplicate packet${skippedCount === 1 ? '' : 's'}.` : ''
    setUiNotice('success', `Imported ${importedCount} command preset${importedCount === 1 ? '' : 's'}.${skippedMessage}`)
    addSystemEntry(`Imported ${importedCount} command preset${importedCount === 1 ? '' : 's'} from XML.`)
  }

  function exportCommandPresetsToXml() {
    if (commandPresets.value.length === 0) {
      errorMessage.value = 'There are no saved command presets to export.'
      return ''
    }

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '',
      '<data>',
      '  <loop>false</loop>',
      '  <repeat_times>1</repeat_times>',
      '  <repeat_period>500</repeat_period>',
      '  <packets_list>',
      ...commandPresets.value.map((preset) => {
        return [
          `    <packet name="${escapeXml(preset.name)}">`,
          `      <payload>${preset.payloadHex}</payload>`,
          '    </packet>',
        ].join('\n')
      }),
      '  </packets_list>',
      '</data>',
    ]

    setUiNotice('success', `Exported ${commandPresets.value.length} command preset${commandPresets.value.length === 1 ? '' : 's'}.`)
    return `${lines.join('\n')}\n`
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

  async function sendTextPayload(command: string, ending: SerialLineEnding, remember = true) {
    const payload = buildTextPayload(command, ending)
    await sendPreparedPayload(payload, command, remember)
  }

  async function sendPreparedPayload(payload: Uint8Array, displayText: string, remember = false) {
    const bytesWritten = await serialService.send(payload)
    txBytes.value += bytesWritten
    addCompleteEntry('tx', displayText)

    if (remember) {
      rememberCommand(displayText)
    }
  }

  function buildTextPayload(command: string, ending: SerialLineEnding) {
    return new TextEncoder().encode(appendLineEnding(command, ending))
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

  function parseCommandPresetXml(xmlText: string): ImportedCommandPresetsResult {
    if (typeof DOMParser === 'undefined') {
      throw new Error('XML import is not available in this environment.')
    }

    const document = new DOMParser().parseFromString(xmlText, 'application/xml')
    const parseError = document.querySelector('parsererror')
    if (parseError) {
      throw new Error('The XML file could not be parsed.')
    }

    const packets = Array.from(document.querySelectorAll('packets_list > packet'))
    if (packets.length === 0) {
      return { importedCount: 0, skippedCount: 0 }
    }

    const importedPresets: SerialCommandPreset[] = []
    let skippedCount = 0

    packets.forEach((packet, index) => {
      const name = packet.getAttribute('name')?.trim() || `Packet ${index + 1}`
      const payloadHex = packet.querySelector('payload')?.textContent?.trim().toUpperCase() ?? ''

      if (!isValidHexPayload(payloadHex)) {
        skippedCount += 1
        return
      }

      const duplicate = commandPresets.value.some((preset) => preset.name === name && preset.payloadHex === payloadHex)
        || importedPresets.some((preset) => preset.name === name && preset.payloadHex === payloadHex)

      if (duplicate) {
        skippedCount += 1
        return
      }

      const decodedPayload = decodePresetPayload(payloadHex)

      importedPresets.push({
        id: createId(),
        name,
        payloadHex,
        commandText: decodedPayload.commandText,
        lineEnding: decodedPayload.lineEnding,
        source: 'imported',
      })
    })

    if (importedPresets.length > 0) {
      commandPresets.value = [...importedPresets, ...commandPresets.value]
    }

    return {
      importedCount: importedPresets.length,
      skippedCount,
    }
  }

  function decodePresetPayload(payloadHex: string) {
    const bytes = hexToBytes(payloadHex)
    const lineEnding = inferLineEnding(bytes)
    const trimmedBytes = trimLineEndingBytes(bytes, lineEnding)

    return {
      commandText: new TextDecoder().decode(trimmedBytes),
      lineEnding,
    }
  }

  function inferLineEnding(bytes: Uint8Array): SerialLineEnding {
    const length = bytes.length

    if (length >= 2 && bytes[length - 2] === 0x0d && bytes[length - 1] === 0x0a) {
      return 'crlf'
    }

    if (length >= 1 && bytes[length - 1] === 0x0a) {
      return 'newline'
    }

    if (length >= 1 && bytes[length - 1] === 0x0d) {
      return 'carriage-return'
    }

    return 'none'
  }

  function trimLineEndingBytes(bytes: Uint8Array, ending: SerialLineEnding) {
    switch (ending) {
      case 'crlf':
        return bytes.slice(0, -2)
      case 'newline':
      case 'carriage-return':
        return bytes.slice(0, -1)
      default:
        return bytes
    }
  }

  function isValidHexPayload(value: string) {
    return value.length > 0 && value.length % 2 === 0 && /^[0-9A-F]+$/i.test(value)
  }

  function clearError() {
    errorMessage.value = ''
  }

  function clearUiNotice() {
    uiNotice.value = null
  }

  function setUiNotice(tone: SerialUiNotice['tone'], message: string) {
    uiNotice.value = {
      id: createId(),
      tone,
      message,
    }
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
    canSavePreset,
    canDisconnect,
    canSend,
    commandHistory,
    commandInput,
    commandPresets,
    connect,
    connectionState,
    dataBitsOptions,
    disconnect,
    displayEntries,
    editingPresetId,
    errorMessage,
    historyCursor,
    initialize,
    importCommandPresetsFromXml,
    isEditingPreset,
    lineEnding,
    beginEditCommandPreset,
    loadCommandPreset,
    parityOptions,
    paused,
    presetNameInput,
    queuedChunkCount,
    rxBytes,
    savePresetLabel,
    searchQuery,
    selectedPortLabel,
    selectedPortMeta,
    sendCommandPreset,
    sendCommand,
    saveCurrentCommandPreset,
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
    uiNotice,
    updateBaudRate,
    updateDataBits,
    updateParity,
    updateStopBits,
    buildLogText,
    cancelEditCommandPreset,
    choosePort,
    clearAllCommandPresets,
    clearError,
    clearUiNotice,
    clearOutput,
    deleteCommandPreset,
    exportCommandPresetsToXml,
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

function readStoredCommandPresets(): SerialCommandPreset[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(COMMAND_PRESETS_STORAGE_KEY)
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return []
      }

      const preset = item as Partial<SerialCommandPreset>
      const lineEndingValue = preset.lineEnding
      const sourceValue = preset.source

      if (
        typeof preset.id !== 'string' ||
        typeof preset.name !== 'string' ||
        typeof preset.payloadHex !== 'string' ||
        typeof preset.commandText !== 'string' ||
        !isSerialLineEnding(lineEndingValue) ||
        !isCommandPresetSource(sourceValue)
      ) {
        return []
      }

      return [
        {
          id: preset.id,
          name: preset.name,
          payloadHex: preset.payloadHex.toUpperCase(),
          commandText: preset.commandText,
          lineEnding: lineEndingValue,
          source: sourceValue,
        } satisfies SerialCommandPreset,
      ]
    })
  } catch {
    return []
  }
}

function writeStoredCommandPresets(presets: SerialCommandPreset[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(COMMAND_PRESETS_STORAGE_KEY, JSON.stringify(presets))
}

function hexToBytes(hex: string) {
  const normalizedHex = hex.trim().replace(/\s+/g, '').toUpperCase()
  const bytes = new Uint8Array(normalizedHex.length / 2)

  for (let index = 0; index < normalizedHex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalizedHex.slice(index, index + 2), 16)
  }

  return bytes
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).toUpperCase().padStart(2, '0')).join('')
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function isSerialLineEnding(value: unknown): value is SerialLineEnding {
  return value === 'none' || value === 'newline' || value === 'carriage-return' || value === 'crlf'
}

function isCommandPresetSource(value: unknown): value is SerialCommandPreset['source'] {
  return value === 'manual' || value === 'imported'
}
