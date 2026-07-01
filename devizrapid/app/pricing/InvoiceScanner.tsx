'use client'

type Props = {
  scanning: boolean
  error: string
  onScan: (file: File) => void
}

export default function InvoiceScanner({ scanning, error, onScan }: Props) {
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onScan(f)
    e.target.value = ''
  }

  return (
    <div>
      <input id="scan-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input id="scan-gallery" type="file" accept="image/*" className="hidden" onChange={pick} />
      <input id="scan-document" type="file" accept=".pdf,.xml,application/pdf,text/xml,application/xml" className="hidden" onChange={pick} />

      {scanning ? (
        <div className="w-full py-4 rounded-2xl bg-blue-300 text-white font-bold text-base flex items-center justify-center shadow-sm">
          Se analizeaza factura...
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <label htmlFor="scan-camera"
              className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold text-base flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
              Fa poza
            </label>
            <label htmlFor="scan-gallery"
              className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold text-base flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
              Galerie
            </label>
          </div>
          <label htmlFor="scan-document"
            className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-base flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
            Incarca PDF / XML
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-500 font-medium text-center mt-2">{error}</p>}
    </div>
  )
}
