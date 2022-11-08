import { FakeNetworkInterface } from './FakeNetworkInterface'
import { LOGLEVELS, ConsoleLogger } from './Logger'

// dont log anything during tests
ConsoleLogger.logLevel = ConsoleLogger.NONE

describe('FakeNetworkInterface', () => {
  const netInterfaceA = new FakeNetworkInterface()
  const netInterfaceB = new FakeNetworkInterface()

  describe('.connectTo', () => {
    it('should setup connection on both interfaces', () => {
      netInterfaceA.connectTo(netInterfaceB.id)

      expect(netInterfaceA._connections.keys()).toContain(netInterfaceB.id)
      expect(netInterfaceB._connections.keys()).toContain(netInterfaceA.id)
    })
  })

  describe('on data', () => {
    it ('should call data event listener with message sent from connected interface', () => {
      const onData = jest.fn()
  
      netInterfaceA.connectTo(netInterfaceB.id)
  
      netInterfaceA.on('connection.data', onData)
  
      netInterfaceB.broadcast({ foo: 'bar' })
  
      expect(onData).toHaveBeenCalled()
      expect(onData.mock.calls[0][1]).toEqual({ foo: 'bar' })
    })
  })
})