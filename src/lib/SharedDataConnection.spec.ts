import { ConsoleLogger, Logger } from './Logger'
import { SharedDataConnection } from './SharedDataConnection'
import { FakeNetworkInterface } from './FakeNetworkInterface'

type Data = {
  message: string
}

// dont log anything during tests
ConsoleLogger.logLevel = ConsoleLogger.NONE

describe('e2e test', () => {
  it('works for 2 peer scenario', () => {
    const netInterfaceA = new FakeNetworkInterface()
    const netInterfaceB = new FakeNetworkInterface()
  
    netInterfaceB.connectTo(netInterfaceA.id)
  
    const sharedDataA = new SharedDataConnection<Data>(netInterfaceA)
    const sharedDataB = new SharedDataConnection<Data>(netInterfaceB)
  
    sharedDataA.initSharedData(doc => {
      doc.message = 'initialized from A'
    })
  
    expect(sharedDataA.sharedData.message).toEqual('initialized from A')
    expect(sharedDataB.sharedData.message).toEqual('initialized from A')
  
    sharedDataA.updateData(doc => {
      doc.message = 'updated from A'
    })
  
    expect(sharedDataA.sharedData.message).toEqual('updated from A')
    expect(sharedDataB.sharedData.message).toEqual('updated from A')
  
  
    sharedDataB.updateData(doc => {
      doc.message = 'updated from B'
    })
  
    expect(sharedDataA.sharedData.message).toEqual('updated from B')
    expect(sharedDataB.sharedData.message).toEqual('updated from B')
  })

  it('works for 3 peer fully connected scanario (A - B - C - A', () => {
    const netInterfaceA = new FakeNetworkInterface()
    const netInterfaceB = new FakeNetworkInterface()
    const netInterfaceC = new FakeNetworkInterface()
  
    netInterfaceB.connectTo(netInterfaceA.id)
    netInterfaceC.connectTo(netInterfaceB.id)
    netInterfaceA.connectTo(netInterfaceC.id)
  
    const sharedDataA = new SharedDataConnection<Data>(netInterfaceA)
    const sharedDataB = new SharedDataConnection<Data>(netInterfaceB)
    const sharedDataC = new SharedDataConnection<Data>(netInterfaceC)

    sharedDataA.initSharedData(doc => {
      doc.message = 'initialized from A'
    })
  
    expect(sharedDataA.sharedData.message).toEqual('initialized from A')
    expect(sharedDataB.sharedData.message).toEqual('initialized from A')
    expect(sharedDataC.sharedData.message).toEqual('initialized from A')
  
    sharedDataA.updateData(doc => {
      doc.message = 'updated from A'
    })
  
    expect(sharedDataA.sharedData.message).toEqual('updated from A')
    expect(sharedDataB.sharedData.message).toEqual('updated from A')
    expect(sharedDataC.sharedData.message).toEqual('updated from A')
  
    sharedDataB.updateData(doc => {
      doc.message = 'updated from B'
    })
  
    expect(sharedDataA.sharedData.message).toEqual('updated from B')
    expect(sharedDataB.sharedData.message).toEqual('updated from B')
    expect(sharedDataC.sharedData.message).toEqual('updated from B')

    sharedDataC.updateData(doc => {
      doc.message = 'updated from C'
    })
  
    expect(sharedDataA.sharedData.message).toEqual('updated from C')
    expect(sharedDataB.sharedData.message).toEqual('updated from C')
    expect(sharedDataC.sharedData.message).toEqual('updated from C')
  })
})
