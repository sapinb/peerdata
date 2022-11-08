import { EventEmitter } from 'eventemitter3'
import * as automerge from '@automerge/automerge'
import type { NetworkConnection, NetworkInterface } from './types'
import {v4 as uuid} from 'uuid'
import { Logger, ConsoleLogger } from './Logger'

type SharedData<T extends {}> = T & {
  __: {
    sessionId: string,
  }
}

type Message = {
  type: string
  sessionId?: string
  originId?: string
  msgId?: string
  [k: string]: any
}

const isMessage = (maybeMessage: any): maybeMessage is Message => maybeMessage && typeof maybeMessage.type == 'string'

type SharedDataConnectionEvents<T extends {}> = {
  change: (patch: automerge.Patch, before: SharedData<T>, after: SharedData<T>) => void
}

export class SharedDataConnection<T extends {}> extends EventEmitter<SharedDataConnectionEvents<T>> {
  private _networkInterface: NetworkInterface
  private _sessionId?: string
  private _sharedData?: automerge.Doc<SharedData<T>>
  private _previouslyBroadcastedIds = new Set<string>()
  readonly log: Logger

  static instances: SharedDataConnection<any>[] = []

  constructor(networkInterface: NetworkInterface, logger?: Logger) {
    super()
    SharedDataConnection.instances.push(this)
    this.log = logger || new ConsoleLogger('SharedDataConnection')
    this.log.tag = `SharedDataConnection/${networkInterface.id}`

    this._networkInterface = networkInterface

    this._networkInterface.on('connection.open', (conn) => {
      // on connection, if we dont already have a session, request for init
      this.log.debug('onConnected')
      if (!this._sharedData) {
        this._sendMessageTo(conn, {
          type: 'requestSessionInit',
        })
      }
    })

    this._networkInterface.on('connection.data', (conn, msg: any) => {
      if (!isMessage(msg)) {
        return
      }

      // relay all messages by default
      let shouldRelay = true

      switch (msg.type) {
        case 'initSession': {
          // another node had initialized session and is sending initial data to everyone
          // accept if the node is not already initialized
          const { sessionId, sharedData } = msg

          if (this._sharedData) {
            this.log.error('Already initialized')
            break;
          }

          this._sessionId = sessionId

          const emptyDoc = automerge.init({ patchCallback: this._patchCallback })

          const [doc] = automerge.applyChanges(emptyDoc, sharedData.map((arrayBuf: ArrayBuffer) => new Uint8Array(arrayBuf)))

          this._sharedData = doc

          break;
        }
        case 'changes': {
          // another node is sending over changes
          // accept if from same session id
          const { sessionId, changes } = msg

          if (!this._sharedData) {
            // not initialized yet. Dont to anything
            break
          }

          if (sessionId !== this._sessionId) {
            this.log.error('wrong session id', sessionId, this._sessionId)
            break
          }

          [this._sharedData,] = automerge.applyChanges(this._sharedData, [new Uint8Array(changes) as any])

          break;
        }
        case 'requestSessionInit': {
          // another node has requested session initialization.

          if (!this._sharedData) {
            // we havent initialized ourselves... dont do anything (but relay init message and hope someone answers)
            break
          }

          // send full data copy as initSession message ONLY to requesting node. And dont relay this message

          shouldRelay = false
          this._sendMessageTo(conn, {
            type: 'initSession',
            sharedData: automerge.getAllChanges(this._sharedData),
          })
          break
        }
        default: {
          // nothing
        }
      }

      if (shouldRelay) {
        this._broadcastMessage(msg, conn.id)
      }
    })
  }

  cleanup() {
    this._networkInterface.cleanup?.()
    this._sessionId = undefined
    this._sharedData = undefined
    this.removeAllListeners()
    SharedDataConnection.instances = SharedDataConnection.instances.filter(instance => instance !== this)
  }

  initSharedData(initData: (doc: SharedData<T>) => void) {
    if (this._sharedData) {
      // already initialized
      return false
    }

    const sessionId = this._sessionId = uuid()

    const emptyDoc = automerge.init({ patchCallback: this._patchCallback })

    this._sharedData = automerge.change(emptyDoc, (doc) => {
      initData(doc)
      doc.__ = { sessionId }
    })

    // message everyone that this node has initialised session and everyone should use this
    this._broadcastMessage({
      type: 'initSession',
      sharedData: automerge.getAllChanges(this._sharedData)
    })

    return true
  }

  requestSharedDataSync() {
    if (this._sharedData) {
      return false
    }

    this._broadcastMessage({
      type: 'requestSessionInit'
    })
  }


  get sharedData(): T | undefined {
    return this._sharedData
  }

  updateData(updater: (doc: SharedData<T>) => void) {
    if (!this._sharedData) {
      // not yet initialized
      console.error('Not initialized')
      throw new Error('Not initialized')
    }

    this._sharedData = automerge.change(this._sharedData, updater)

    const changes = automerge.getLastLocalChange(this._sharedData)

    this._broadcastMessage({
      type: 'changes',
      changes: changes
    })
  }

  private _broadcastMessage(message: Message, src?: string) {
    if (message.msgId && this._previouslyBroadcastedIds.has(message.msgId)) {
      // this message has already been broadcasted. dont broadcast again
      this.log.debug('already seen message', message.msgId, 'dont broadcast')
      return
    }

    const msgId = message.msgId || uuid()
    const originId = message.originId || this._networkInterface.id

    this._previouslyBroadcastedIds.add(msgId)

    this._networkInterface.broadcast({
      ...message,
      sessionId: this._sessionId,
      msgId,
      originId,
      relay: this._networkInterface.id !== message.originId,
    }, { excludeIds: src ? [src] : [] })
  }

  private _sendMessageTo(destConnection: NetworkConnection, message: Message) {
    const msgId = uuid()
    const originId = this._networkInterface.id

    destConnection.send({
      ...message,
      sessionId: this._sessionId,
      msgId,
      originId,
    })
  }

  private _patchCallback: automerge.PatchCallback<SharedData<T>> = (patch, before, after) => {
    this.log.debug('patchCallback', after)
    this.emit('change', patch, before, after)
  }
}

declare global {
  interface _Dev {
    automerge: typeof automerge
    SharedDataConnection: typeof SharedDataConnection
  }

  interface Window {
    __dev: _Dev
  }
}

window.__dev = window.__dev || {}
window.__dev.automerge = automerge
window.__dev.SharedDataConnection = SharedDataConnection