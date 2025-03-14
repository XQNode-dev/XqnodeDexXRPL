function encodeASCIIIfNeeded(token: string): string {
  if (token.length <= 3) {
    return token.toUpperCase();
  }
  if (/^[A-Fa-f0-9]{40}$/.test(token)) {
    return token.toUpperCase();
  }
  const maxBytes = 20;
  const buf = new Uint8Array(maxBytes);
  const asciiBytes = [...token].map((c) => c.charCodeAt(0));
  for (let i = 0; i < maxBytes; i++) {
    buf[i] = asciiBytes[i] ?? 0;
  }
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export function constructTokenCurrency(token: string, issuer?: string) {
  if (token === "XRP") {
    return "XRP";
  }
  if (!issuer) {
    throw new Error(`Issuer is required for token ${token}`);
  }
  const finalCurrency = encodeASCIIIfNeeded(token);
  return {
    currency: finalCurrency,
    issuer
  };
}
