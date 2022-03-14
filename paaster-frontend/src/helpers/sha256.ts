export function sha256Hash(toHash: string): Promise<string> {
  const utf8 = new TextEncoder().encode(toHash)
  return crypto.subtle.digest('SHA-256', utf8).then((hashBuffer) => {
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(
        (bytes) => bytes.toString(16).padStart(2, '0')
      ).join('')
  })
}
