import { toast } from 'sonner'

export const toastSuccess = (msg: string) => toast.success(msg)
export const toastError   = (msg: string) => toast.error(msg)
export const toastWarning = (msg: string) => toast.warning(msg)
export const toastInfo    = (msg: string) => toast(msg, { duration: 2000 })

/** Returns the toast id so you can call toastDone(id) later */
export function toastLoading(msg: string): string | number {
  return toast.loading(msg)
}

/** Resolve a loading toast to success */
export function toastDone(id: string | number, msg: string) {
  toast.success(msg, { id })
}

/** Resolve a loading toast to error */
export function toastFail(id: string | number, msg: string) {
  toast.error(msg, { id })
}
