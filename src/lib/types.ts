export type NetworkConnection = {
  id: string
  send: (data: any) => void
}

export type OnDataListener = (conn: NetworkConnection, data: unknown) => void
export type OnConnectedListener = (conn: NetworkConnection) => void
export type BroadcastConfig = {
  excludeIds: string[]
}

export interface NetworkInterface {
  id: string
  connectTo: (destId: string) => NetworkConnection | false
  onData: (listener: OnDataListener) => void
  onConnected: (listener: OnConnectedListener) => void
  broadcast: (data: unknown, config?: BroadcastConfig) => void
  cleanup?: () => void
} 
