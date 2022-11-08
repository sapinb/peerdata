export type NetworkConnection = {
  id: string
  send: (data: any) => void
}

export type BroadcastConfig = {
  excludeIds: string[]
}

export type NetworkInterfaceEvents = {
  'connection.open': (conn: NetworkConnection) => void
  'connection.data': (conn: NetworkConnection, data: unknown) => void
}

export interface NetworkInterface {
  id: string
  connectTo: (destId: string) => NetworkConnection | false
  broadcast: (data: unknown, config?: BroadcastConfig) => void
  cleanup?: () => void
  on(event: 'connection.open', listener: (conn: NetworkConnection) => void): this
  on(event: 'connection.data', listener: (conn: NetworkConnection, data: unknown) => void): this
}
