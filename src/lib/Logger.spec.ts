import { Logger, LOGLEVELS } from './Logger'

describe('Logger', () => {
  class TestLogger extends Logger {
    _log(...data: any[]) {}
  }

  describe('when logLevel is INFO', () => {
    const logger = new TestLogger()
    jest.spyOn(logger, '_log')

    logger.logLevel = LOGLEVELS.INFO

    it('logs ERROR logs', () => {
      logger.error('foo')
      expect(logger._log).toBeCalled()
    })

    it('logs WARN logs', () => {
      logger.warn('foo')
      expect(logger._log).toBeCalled()
    })

    it('logs INFO logs', () => {
      logger.info('foo')
      expect(logger._log).toBeCalled()
    })

    it('does not log DEGUG logs', () => {
      logger.debug('foo')
      expect(logger._log).not.toBeCalled()
    })

  })

  describe('when logLevel is NONE', () => {
    const logger = new TestLogger()
    jest.spyOn(logger, '_log')

    logger.logLevel = LOGLEVELS.NONE

    it('logs ERROR logs', () => {
      logger.error('foo')
      expect(logger._log).not.toBeCalled()
    })

    it('logs WARN logs', () => {
      logger.warn('foo')
      expect(logger._log).not.toBeCalled()
    })

    it('logs INFO logs', () => {
      logger.info('foo')
      expect(logger._log).not.toBeCalled()
    })

    it('does not log DEGUG logs', () => {
      logger.debug('foo')
      expect(logger._log).not.toBeCalled()
    })
  })

  describe('when default logLevel is used', () => {
    it('uses static logLevel from own class', () => {
      const logger = new TestLogger()
      jest.spyOn(logger, '_log')
  
      logger.logLevel = LOGLEVELS.DEFAULT
      TestLogger.logLevel = LOGLEVELS.ERROR

      expect(TestLogger.logLevel).not.toBe(Logger.logLevel)
      expect(logger['_logLevel']()).toBe(LOGLEVELS.ERROR)
    })
  })
})