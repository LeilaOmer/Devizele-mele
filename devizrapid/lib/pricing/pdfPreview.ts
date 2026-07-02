// Randeaza un PDF (blob) la imagini pe client. Necesar pentru preview pe MOBIL:
// <iframe src=blob-pdf> nu afiseaza nimic pe majoritatea browserelor mobile
// (iOS Safari, WebView-uri, browserul din WhatsApp), dar o imagine <img> se
// afiseaza peste tot. Randam cu pdfjs-dist (deja in proiect).
export async function renderPdfToImages(blob: Blob, scale = 2): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Workerul din pachet (nu de pe un CDN extern — ar cadea pe CSP/offline).
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const data = new Uint8Array(await blob.arrayBuffer())
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const images: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    await page.render({ canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0]).promise
    images.push(canvas.toDataURL('image/jpeg', 0.85))
  }
  return images
}
