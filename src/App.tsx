import { useReducer, Reducer, useRef, useEffect, useState, useCallback } from 'react';
import './App.css';
import { SharedDataConnection } from './lib/SharedDataConnection'
import { PeerJsInterface } from './lib/PeerJsInterface'
import { ConsoleLogger } from './lib/Logger'


type SharedState = {
  messages: string[]
}

type State = {
  shared: SharedState
  local: {
    id: string
    connectedTo: string[]
  }
}

type Action = {
  type: string
  [key: string]: unknown
}

const initialState: State = {
  shared: {
    messages: []
  },
  local: {
    id: '',
    connectedTo: []
  }
}

const log = new ConsoleLogger('App')

function App() {
  const netConnRef = useRef<PeerJsInterface>()
  const sharedDataConnectionRef = useRef<SharedDataConnection<SharedState>>()

  const [state, dispatch] = useReducer<Reducer<State, Action>>((state, action) => {
    log.debug('action', action)
    switch (action.type) {
      case 'SharedState/Sync': {
        // sync shared data to react state
        return {
          ...state,
          shared: action.newState as SharedState
        }
      }
      case 'UI/NetConnectionStateChanged': {
        return {
          ...state,
          local: {
            ...state.local,
            id: action.id as string,
            connectedTo: action.connections as string[],
          }
        }
      }
      default: {
        return state
      }
    }
  }, initialState)

  const [peerId, setPeerId] = useState<string>('')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    log.debug('use effect')

    const netConn = netConnRef.current = new PeerJsInterface()
    const sharedDataConn = sharedDataConnectionRef.current =  new SharedDataConnection(netConn)

    log.debug('id', netConn.id)

    sharedDataConn.on('change', (patch, before, after) => {
      dispatch({
        type: 'SharedState/Sync',
        newState: after,
      })
    })

    netConn.on('change', (netState) => {
      dispatch({
        type: 'UI/NetConnectionStateChanged',
        id: netState.id,
        connections: netState.connections,
      })
    })

    return () => {
      // cleanup 
      log.debug('use effect: cleaning up')
      // .cleanup() handles removing listeners
      netConn.cleanup()
      sharedDataConn.cleanup()
      netConnRef.current = undefined
      sharedDataConnectionRef.current = undefined
    }
  }, [])

  const onInitSession = useCallback(() => {
    sharedDataConnectionRef.current?.initSharedData(doc => {
      doc.messages = [`init from ${netConnRef.current?.id}`]
    })
  }, [])

  const onConnectToPeer = useCallback(() => {
    log.debug('connectTo', peerId)

    const conn = netConnRef.current?.connectTo(peerId)
    if (!conn) {
      log.error('Connection failed')
    }
  }, [peerId])

  const onAddMessage = useCallback(() => {
    sharedDataConnectionRef.current?.updateData(sharedData => {
      sharedData.messages.push(message)
    })
  }, [message])

  return (
    <div>
      <div>ID: {state.local.id}</div>
      <div>
        Session: {sharedDataConnectionRef.current?.sharedData ? 'Y' : 'N'}
        <button onClick={onInitSession}>Init Session</button>
      </div>
      <div>Connected To: {state.local.connectedTo.join(', ') || 'NONE'}</div>
      <div>
        <input placeholder='Peer Id' value={peerId} onChange={evt => { setPeerId(evt.target.value.trim()) }} />
        <button onClick={onConnectToPeer}>Connect</button>
      </div>
      <div>Messages:</div>
      <div>
        <input placeholder='Message' value={message} onChange={evt => { setMessage(evt.target.value) }} />
        <button onClick={onAddMessage}>Send</button>
      </div>
      <div>
        {state.shared.messages.map((msg, idx) => (
          <div key={idx.toString()}>{msg}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
