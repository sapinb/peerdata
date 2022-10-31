export enum LOGLEVELS {
  DEFAULT = -1,
  NONE = 0,
  ERROR,
  WARN,
  INFO,
  DEBUG,
}

export abstract class Logger {
  static NONE = LOGLEVELS.NONE
  static ERROR = LOGLEVELS.ERROR
  static WARN = LOGLEVELS.WARN
  static INFO = LOGLEVELS.INFO
  static DEBUG = LOGLEVELS.DEBUG

  public logLevel: LOGLEVELS
  public tag: string

  static logLevel = LOGLEVELS.INFO

  constructor(tag: string = 'LOG', logLevel = LOGLEVELS.DEFAULT) {
    this.tag = tag
    this.logLevel = logLevel
  }

  error(...data: any[]) {
    this.log(LOGLEVELS.ERROR, ...data)
  }

  warn(...data: any[]) {
    this.log(LOGLEVELS.WARN, ...data)
  }

  info(...data: any[]) {
    this.log(LOGLEVELS.INFO, ...data)
  }

  debug(...data: any[]) {
    this.log(LOGLEVELS.DEBUG, ...data)
  }

  protected log(level: LOGLEVELS, ...data: any[]) {
    const logLevel = this._logLevel()
    if (logLevel != LOGLEVELS.NONE && level <= logLevel) {
      this._log(LOGLEVELS[level], this.tag, ...data)
    }
  }

  protected _logLevel() {
    if (this.logLevel !== LOGLEVELS.DEFAULT) 
      return this.logLevel
    
    // get static logLevel of class of calling instance 
    return (<typeof Logger>this.constructor).logLevel
  }

  protected abstract _log(...data: any[]): void
}

export class ConsoleLogger extends Logger {
  protected _log(...data: any[]) {
    console.log(...data)
  }
}
