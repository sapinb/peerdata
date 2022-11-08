import { Peer, DataConnection } from 'peerjs'
import { ConsoleLogger, Logger } from './Logger'
import { EventEmitter } from 'eventemitter3'
import type { NetworkInterface, NetworkConnection, BroadcastConfig } from './types'

const connToNetworkConnection = (conn: DataConnection): NetworkConnection => {
  const netConn = conn as any as NetworkConnection
  netConn.id = conn.peer
  return netConn
}

type PeerJsInterfaceState = {
  id: string
  connections: string[]
}

type PeerJsInterfaceEvents = {
  'peer.open': (id: string) => void
  connection: (conn: NetworkConnection) => void
  'connection.open': (conn: NetworkConnection) => void
  'connection.data': (conn: NetworkConnection, data: unknown) => void
  change: (state: PeerJsInterfaceState) => void
}

export class PeerJsInterface extends EventEmitter<PeerJsInterfaceEvents> implements NetworkInterface {
  private _peer: Peer
  private _peerId?: string
  private _connections: Map<string, DataConnection> = new Map()
  readonly log: Logger

  static instances: PeerJsInterface[] = []

  constructor(logger?: Logger) {
    super()
    PeerJsInterface.instances.push(this)
    this._peer = new Peer()
    this.log = logger || new ConsoleLogger('PeerJsInterface')

    this._peer.on('open', id => {
      this.log.debug('interface open', id)
      this._peerId = id
      this.log.tag = `PeerJsInterface/${id}`
      this.emit('peer.open', id)
      this.emit('change', this._getState())
    })

    this._peer.on('connection', conn => {
      this._setupConnection(conn)
      this.emit('connection', connToNetworkConnection(conn))
      this.emit('change', this._getState())
    })

    this._peer.on('error', err => {
      this.log.error('error in peer connection', err)
    })
  }

  cleanup() {
    this._connections.forEach(conn => { conn.close() })
    this._peer.destroy()
    this.removeAllListeners('change')
    this.removeAllListeners('connection')
    this.removeAllListeners('connection.data')
    this.removeAllListeners('connection.open')
    this.removeAllListeners('peer.open')
    PeerJsInterface.instances = PeerJsInterface.instances.filter(instance => instance !== this)
  }

  get id() {
    return this._peer.id
  }

  connectTo(destinationPeerId: string) {
    const conn = this._peer.connect(destinationPeerId)

    this._setupConnection(conn)

    return connToNetworkConnection(conn)
  }

  peerIds() {
    return Array.from(this._connections.keys())
  }

  broadcast(data: unknown, config: BroadcastConfig = { excludeIds: [] }) {
    this._connections.forEach(conn => {
      if (config && config.excludeIds && config.excludeIds.includes(conn.peer)) {
        return
      }
      conn.send(data)
    })
  }
  
  private _setupConnection(conn: DataConnection) {
    this._connections.set(conn.peer, conn)

    conn.on('open', () => {
      this.log.debug('conn open')
      this.emit('connection.open', connToNetworkConnection(conn))
      this.emit('change', this._getState())
    })

    conn.on('data', (data) => {
      this.emit('connection.data', connToNetworkConnection(conn), data)
    })

    conn.on('close', () => {
      this._connections.delete(conn.peer)
      this.emit('change', this._getState())
    })

    conn.on('error', (error) => {
      this.log.error('connection error', conn.peer, error)
    })
  }

  private _getState(): PeerJsInterfaceState {
    return {
      id: this._peer.id,
      connections: Array.from(this._connections.keys())
    }
  }
}

declare global {
  interface _Dev {
    PeerJsInterface: typeof PeerJsInterface
  }

  interface Window {
    __dev: _Dev
  }
}

window.__dev = window.__dev || {}
window.__dev.PeerJsInterface = PeerJsInterface
