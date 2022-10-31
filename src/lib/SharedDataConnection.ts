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


export class SharedDataConnection<T extends {}> {
  private _networkInterface: NetworkInterface
  private _sessionId?: string
  private _sharedData: automerge.Doc<SharedData<T>>
  private _isSharedDataInitialized: boolean = false
  private _previouslyBroadcastedIds = new Set<string>()
  readonly log: Logger

  constructor(networkInterface: NetworkInterface, logger?: Logger) {
    this.log = logger || new ConsoleLogger()
    this.log.tag = `SharedDataConnection/${networkInterface.id}`

    this._sharedData = automerge.init<SharedData<T>>()
    this._networkInterface = networkInterface

    this._networkInterface.onConnected((conn) => {
      // on connection, if we dont already have a session, request for init
      this.log.debug('onConnected')
      if (!this._isSharedDataInitialized) {
        this._sendMessageTo(conn, {
          type: 'requestSessionInit',
        })
      }
    })

    this._networkInterface.onData((conn, msg: any) => {
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

          if (this._isSharedDataInitialized) {
            this.log.error('Already initialized')
            break;
          }

          this._sessionId = sessionId

          this._sharedData = automerge.load(new Uint8Array(sharedData))

          break;
        }
        case 'changes': {
          // another node is sending over changes
          // accept if from same session id
          const { sessionId, changes } = msg

          if (sessionId != this._sessionId) {
            this.log.error('wrong session id', sessionId, this._sessionId)
            break
          }

          [this._sharedData,] = automerge.applyChanges(this._sharedData, [new Uint8Array(changes) as any])

          break;
        }
        case 'requestSessionInit': {
          // another node has requested session initialization.

          if (!this._isSharedDataInitialized) {
            // we havent initialized ourselves... dont do anything (but relay init message and hope someone answers)
            break
          }

          // send full data copy as initSession message ONLY to requesting node. And dont relay this message

          shouldRelay = false
          this._sendMessageTo(conn, {
            type: 'initSession',
            sharedData: automerge.save(this._sharedData).buffer,
          })
          break
        }
        default: {
          // nothing
        }
      }

      if (shouldRelay) {
        this._broadcastMessage(msg)
      }
    })
  }

  initSharedData(initData: (doc: SharedData<T>) => void) {
    if (this._isSharedDataInitialized) {
      return false
    }

    const sessionId = this._sessionId = uuid()

    this._sharedData = automerge.init<SharedData<T>>()
    this._sharedData = automerge.change(this._sharedData, (doc) => {
      initData(doc)
      doc.__ = { sessionId }
    })

    this._isSharedDataInitialized = true

    // message everyone that this node has initialised session and everyone should use this
    this._broadcastMessage({
      type: 'initSession',
      sharedData: automerge.save(this._sharedData).buffer
    })

    return true
  }

  requestSharedDataSync() {
    if (this._isSharedDataInitialized) {
      return false
    }

    this._broadcastMessage({
      type: 'requestSessionInit'
    })
  }


  get sharedData(): T {
    return this._sharedData
  }

  updateData(updater: (doc: SharedData<T>) => void) {
    this._sharedData = automerge.change(this._sharedData, updater)

    const changes = automerge.getLastLocalChange(this._sharedData)

    this._broadcastMessage({
      type: 'changes',
      changes: changes && changes.buffer
    })
  }

  private _broadcastMessage(message: Message) {
    if (message.msgId && this._previouslyBroadcastedIds.has(message.msgId)) {
      // this message has already been broadcasted. dont broadcast again
      this.log.debug('already seen message', message.msgId, 'dont broadcast')
      return
    }

    const msgId = message.msgId || uuid()
    const originId = message.originId || this._networkInterface.id

    this._previouslyBroadcastedIds.add(msgId)

    // TODO: dont broadcast back to source if relay message (need to pass src connection to this method to do this)
    this._networkInterface.broadcast({
      ...message,
      sessionId: this._sessionId,
      msgId,
      originId,
      relay: this._networkInterface.id !== message.originId,
    })
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
}