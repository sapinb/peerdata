import React, { useReducer, Reducer, useRef, useEffect, useState, useCallback } from 'react';
import './App.css';
import { SharedDataConnection } from './lib/SharedDataConnection'
import { PeerJsInterface } from './lib/PeerJsInterface'
import { NetworkInterface } from './lib/types'
import { ConsoleLogger } from './lib/Logger'


type SharedState = {
  messages: string[]
}

type State = {
  shared: SharedState
  local: {
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
    connectedTo: []
  }
}

const log = new ConsoleLogger('App', ConsoleLogger.DEBUG)

function App() {
  const netConnRef = useRef<NetworkInterface>()
  const sharedDataConnectionRef = useRef<SharedDataConnection<SharedState>>()

  const [state, dispatch] = useReducer<Reducer<State, Action>>((state, action) => {
    log.debug('action', action)
    switch (action.type) {
      case 'SharedState/Change': {
        return {
          ...state,
          shared: action.newState as SharedState
        }
      }
      case 'UI/AddMessage': {
        // add message to sharedData

        if (!sharedDataConnectionRef.current) {
          log.error('no sharedDataConnectionRef')
          return state
        }

        sharedDataConnectionRef.current?.updateData(sharedData => {
          sharedData.messages.push(action.message as string)
        })

        return state
      }
      case 'UI/Connect': {
        if (!netConnRef.current) {
          log.error('no netConnref')
          return state
        }
        const conn = netConnRef.current.connectTo(action.peerId as string)
        if (!conn) {
          log.error('Connection failed')
          return state
        }
        return {
          ...state,
          local: {
            ...state.local,
            connectedTo: [...state.local.connectedTo, action.peerId as string]
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
    console.log('use effect')

    const netConn = netConnRef.current = new PeerJsInterface()
    const sharedDataConn = sharedDataConnectionRef.current = new SharedDataConnection(netConn)

    console.log('id', netConn.id)

    sharedDataConn.onChange((patch, before, after) => {
      dispatch({
        type: 'SharedState/Change',
        newState: after
      })
    })

    return () => {
      // cleanup 
      console.log('use effect: cleaning up')
      netConn.cleanup()
      sharedDataConn.cleanup()
    }

  }, [])

  const onConnectToPeer = useCallback(() => {
    console.log('connectTo', peerId)
    dispatch({
      type: 'UI/Connect',
      peerId: peerId
    })
  }, [peerId])

  const onAddMessage = useCallback(() => {
    dispatch({
      type: 'UI/AddMessage',
      message: message
    })
  }, [message])

  const onInitSession = () => {
    sharedDataConnectionRef.current?.initSharedData(doc => {
      doc.messages = [`init from ${netConnRef.current?.id}`]
    })
  }

  return (
    <div>
      <div>ID: {netConnRef.current?.id}</div>
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
