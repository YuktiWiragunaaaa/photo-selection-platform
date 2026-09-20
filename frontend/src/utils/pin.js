// [ID] PIN acak 4 digit dan pengingat PIN di browser admin.
/** Random 4-digit PIN without "easy" patterns (1234, 000000, 121212…). */
export function randomPin(len = 4) {
  const easy = (p) => /^(\d)\1+$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p) || /^(\d\d)\1+$/.test(p)
  let p
  do {
    const a = new Uint32Array(len)
    crypto.getRandomValues(a)
    p = Array.from(a, (n) => n % 10).join('')
  } while (easy(p))
  return p
}

// The server only stores a hash, so the admin's browser remembers the PIN it set
// (for the WhatsApp message). Never sent anywhere.
const key = (id) => `psp_pin_${id}`
export const rememberPin = (id, pin) => {
  try {
    pin ? localStorage.setItem(key(id), pin) : localStorage.removeItem(key(id))
  } catch {}
}
export const recallPin = (id) => {
  try {
    return localStorage.getItem(key(id)) || ''
  } catch {
    return ''
  }
}
