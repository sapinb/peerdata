import { Peer, DataConnection } from 'peerjs'
import { ConsoleLogger, Logger } from './Logger'
import type { NetworkInterface, OnDataListener, OnConnectedListener, NetworkConnection, BroadcastConfig } from './types'

const connToNetworkConnecton = (conn: DataConnection): NetworkConnection => ({
  ...conn,
  send: conn.send,
  id: conn.peer,
})

export class PeerJsInerface implements NetworkInterface {
  private _peer: Peer
  private _peerId?: string
  private _connections: Map<string, DataConnection> = new Map()
  private _onDataListener?: OnDataListener
  private _onConnectedListener?: OnConnectedListener
  readonly log: Logger

  constructor(logger?: Logger) {
    this._peer = new Peer
    this.log = logger || new ConsoleLogger('PeerJsInterface')

    this._peer.on('open', id => {
      this._peerId = id
      this.log.tag = `PeerJsInterface/${id}`
    })

    this._peer.on('connection', conn => {
      this._setupConnection(conn)
    })

    this._peer.on('error', err => {
      this.log.error('error in peer connection', err)
    })
  }

  get id() {
    return this._peer.id
  }

  connectTo(destinationPeerId: string) {
    const conn = this._peer.connect(destinationPeerId)

    this._setupConnection(conn)

    this._onConnectedListener && this._onConnectedListener(connToNetworkConnecton(conn))

    return connToNetworkConnecton(conn)
  }

  peerIds() {
    return Array.from(this._connections.keys())
  }

  onData(listener: OnDataListener) {
    this._onDataListener = listener
  }

  onConnected(listener: OnConnectedListener) {
    this._onConnectedListener = listener
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

    })

    conn.on('data', (data) => {
      this._onDataListener && this._onDataListener(connToNetworkConnecton(conn), data)
    })

    conn.on('close', () => {
      this._connections.delete(conn.peer)
    })

    conn.on('error', (error) => {
      this.log.error('connection error', conn.peer, error)
    })

  }
}