describe('lib/logger.ts', () => {
  let originalEnv: string | undefined
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleInfoSpy: jest.SpyInstance
  let consoleDebugSpy: jest.SpyInstance

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()
    consoleDebugSpy.mockRestore()
    jest.resetModules()
  })

  describe('error', () => {
    it('should log error message', () => {
      process.env.NODE_ENV = 'production'
      const { logger } = require('@/lib/logger')

      logger.error('Test error message')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleErrorSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.level).toBe('error')
      expect(logData.message).toBe('Test error message')
      expect(logData.timestamp).toBeDefined()
    })

    it('should log error with Error object in development', () => {
      process.env.NODE_ENV = 'development'
      const { logger } = require('@/lib/logger')

      const error = new Error('Test error')
      logger.error('Error occurred', error)

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleErrorSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.level).toBe('error')
      expect(logData.message).toBe('Error occurred')
      expect(logData.error.name).toBe('Error')
      expect(logData.error.message).toBe('Test error')
      expect(logData.error.stack).toBeDefined()
    })

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production'
      const { logger } = require('@/lib/logger')

      const error = new Error('Test error')
      logger.error('Error occurred', error)

      const logCall = consoleErrorSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.error.stack).toBeUndefined()
    })

    it('should log error with non-Error object', () => {
      process.env.NODE_ENV = 'production'
      const { logger } = require('@/lib/logger')

      logger.error('Error occurred', { code: 'ERR001', details: 'Something went wrong' })

      const logCall = consoleErrorSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.error.code).toBe('ERR001')
      expect(logData.error.details).toBe('Something went wrong')
    })

    it('should include context data', () => {
      process.env.NODE_ENV = 'production'
      const { logger } = require('@/lib/logger')

      logger.error('Error occurred', undefined, { userId: 'user-1', action: 'login' })

      const logCall = consoleErrorSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.userId).toBe('user-1')
      expect(logData.action).toBe('login')
    })
  })

  describe('warn', () => {
    it('should log warning message', () => {
      process.env.NODE_ENV = 'production'
      const { logger } = require('@/lib/logger')

      logger.warn('Test warning')

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleWarnSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.level).toBe('warn')
      expect(logData.message).toBe('Test warning')
      expect(logData.timestamp).toBeDefined()
    })

    it('should include context data', () => {
      process.env.NODE_ENV = 'production'
      const { logger } = require('@/lib/logger')

      logger.warn('Warning message', { resource: 'api', endpoint: '/test' })

      const logCall = consoleWarnSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.resource).toBe('api')
      expect(logData.endpoint).toBe('/test')
    })
  })

  describe('info', () => {
    it('should log info message in development', () => {
      process.env.NODE_ENV = 'development'
      const { logger } = require('@/lib/logger')

      logger.info('Test info')

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleInfoSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.level).toBe('info')
      expect(logData.message).toBe('Test info')
    })

    it('should not log info in production', () => {
      process.env.NODE_ENV = 'production'
      const { logger } = require('@/lib/logger')

      logger.info('Test info')

      expect(consoleInfoSpy).not.toHaveBeenCalled()
    })

    it('should include context data', () => {
      process.env.NODE_ENV = 'development'
      const { logger } = require('@/lib/logger')

      logger.info('Info message', { userId: 'user-1' })

      const logCall = consoleInfoSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.userId).toBe('user-1')
    })
  })

  describe('debug', () => {
    it('should log debug message in development', () => {
      process.env.NODE_ENV = 'development'
      const { logger } = require('@/lib/logger')

      logger.debug('Test debug')

      expect(consoleDebugSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleDebugSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.level).toBe('debug')
      expect(logData.message).toBe('Test debug')
    })

    it('should not log debug in production', () => {
      process.env.NODE_ENV = 'production'
      const { logger } = require('@/lib/logger')

      logger.debug('Test debug')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
    })

    it('should include context data', () => {
      process.env.NODE_ENV = 'development'
      const { logger } = require('@/lib/logger')

      logger.debug('Debug message', { requestId: 'req-123' })

      const logCall = consoleDebugSpy.mock.calls[0][0]
      const logData = JSON.parse(logCall)
      expect(logData.requestId).toBe('req-123')
    })
  })
})
