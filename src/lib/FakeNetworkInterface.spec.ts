import { FakeNetworkInterface } from './FakeNetworkInterface'
import { LOGLEVELS } from './Logger'

describe('FakeNetworkInterface', () => {
  const netInterfaceA = new FakeNetworkInterface()
  const netInterfaceB = new FakeNetworkInterface()

  netInterfaceA.log.logLevel = LOGLEVELS.NONE
  netInterfaceB.log.logLevel = LOGLEVELS.NONE

  describe('.connectTo', () => {
    it('should setup connection on both interfaces', () => {
      netInterfaceA.connectTo(netInterfaceB.id)

      expect(netInterfaceA._connections.keys()).toContain(netInterfaceB.id)
      expect(netInterfaceB._connections.keys()).toContain(netInterfaceA.id)
    })
  })

  describe('.onData', () => {
    const onData = jest.fn()

    netInterfaceA.connectTo(netInterfaceB.id)

    netInterfaceA.onData(onData)

    netInterfaceB.broadcast({ foo: 'bar' })

    expect(onData).toHaveBeenCalled()
    expect(onData.mock.calls[0][1]).toEqual({ foo: 'bar' })
  })
})