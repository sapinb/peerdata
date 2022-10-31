import type { NetworkConnection, OnConnectedListener, OnDataListener, BroadcastConfig, NetworkInterface } from './types'
import { Logger, ConsoleLogger } from './Logger'

export class FakeNetworkInterface implements NetworkInterface {
  static _idCounter = 1
  static _allConnections = new Map<string, FakeNetworkInterface>

  readonly id: string

  readonly _connections = new Map<string, FakeNetworkInterface>
  private _onDataListener?: OnDataListener
  private _onConnectedListener?: OnConnectedListener
  readonly log: Logger

  constructor() {
    this.id = (FakeNetworkInterface._idCounter++).toString()
    this.log = new ConsoleLogger(`FakeNetworkInterface/${this.id}`)

    FakeNetworkInterface._allConnections.set(this.id, this)
  }

  connectTo (destId: string) {
    const destConnection = FakeNetworkInterface._allConnections.get(destId)
    if (!destConnection) {
      return false
    }

    this._connections.set(destId, destConnection)
    destConnection._connections.set(this.id, this)

    this._onConnectedListener && this._onConnectedListener(this._getSendInterface(destConnection))

    return this._getSendInterface(destConnection)
  }

  onData (listener: OnDataListener) {
    this._onDataListener = listener
  }

  onConnected (listener: OnConnectedListener) {
    this._onConnectedListener = listener
  }

  broadcast (data: unknown, options: BroadcastConfig = { excludeIds: [] }) {
    const excludeIds = new Set(options.excludeIds)
    this._connections.forEach(destConn => {
      if (excludeIds.has(destConn.id)) {
        // skip
        return
      }
      destConn._receive(this.id, data)
    })
  }

  private _send(destId: string, data: any) {
    const destConn = this._connections.get(destId)

    if (!destConn) {
      return
    }

    this.log.debug('send', this.id, '->', destId, data.type)

    destConn._receive(this.id, data)
  }

  private _receive(srcId: string, data: any) {
    const srcConn = this._connections.get(srcId)

    if (!srcConn) {
      return
    }

    this.log.debug('recv', srcId, '->', this.id, data.type)

    this._onDataListener && this._onDataListener(this._getSendInterface(srcConn), data)
  }

  private _getSendInterface(conn: FakeNetworkInterface): NetworkConnection {
    return {
      id: conn.id,
      send: (data: any) => {
        this._send(conn.id, data)
      }
    }
  }
}