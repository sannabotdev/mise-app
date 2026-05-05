const ts = () => new Date().toISOString().slice(11, 23)

export function createLogger(route: string) {
  return {
    info(msg: string, data?: unknown) {
      if (data !== undefined) console.log(`[${ts()}] ${route} | ${msg}`, data)
      else console.log(`[${ts()}] ${route} | ${msg}`)
    },
    warn(msg: string, data?: unknown) {
      if (data !== undefined) console.warn(`[${ts()}] ${route} | WARN ${msg}`, data)
      else console.warn(`[${ts()}] ${route} | WARN ${msg}`)
    },
    error(msg: string, err?: unknown) {
      const detail = err instanceof Error
        ? `${err.message}\n${err.stack}`
        : err
      console.error(`[${ts()}] ${route} | ERROR ${msg}`, detail ?? '')
    },
  }
}
