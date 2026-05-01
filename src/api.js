const KEY_STORE = 'jkey'

export const getStoredKey = () => localStorage.getItem(KEY_STORE) || ''
export const setStoredKey = (k) => localStorage.setItem(KEY_STORE, k)
export const clearStoredKey = () => localStorage.removeItem(KEY_STORE)

async function req(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getStoredKey(),
      ...(opts.headers || {}),
    },
  })
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const getJournals = () => req('/api/journals')

export const createJournal = (data) =>
  req('/api/journals', { method: 'POST', body: JSON.stringify(data) })

export const deleteJournal = (id) =>
  req(`/api/journals/${id}`, { method: 'DELETE' })

export const getPages = (journalId) =>
  req(`/api/journals/${journalId}/pages`)

export const addPage = (journalId, page) =>
  req(`/api/journals/${journalId}/pages`, { method: 'POST', body: JSON.stringify(page) })

export const savePage = (pageId, content, journalId) =>
  req(`/api/pages/${pageId}`, { method: 'PUT', body: JSON.stringify({ content, journal_id: journalId }) })

// Compress an image File to a base64 JPEG, capped at maxWidth px and ~quality
export async function compressImage(file, maxWidth = 900, quality = 0.72) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })
}
