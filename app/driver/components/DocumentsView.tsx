'use client'

import { useRef } from 'react'
import type { UploadedDocument } from '../types'

interface Props {
  documents: UploadedDocument[]
}

export default function DocumentsView({ documents }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Placeholder — wire to Firebase Storage in production
    alert(`"${file.name}" selected. Connect Firebase Storage to upload.`)
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 bg-white px-6 py-12 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-50"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
          <svg className="h-6 w-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-700">Click to upload a document</p>
        <p className="mt-1 text-xs text-zinc-400">PDF, JPG, PNG up to 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Documents list */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Uploaded Documents</h2>
        </div>
        {documents.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 px-6 py-4">
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                  <svg className="h-5 w-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{doc.name}</p>
                  <p className="text-xs text-zinc-500">{doc.type} · {doc.size} · Uploaded {doc.uploadDate}</p>
                </div>

                {/* Status badge */}
                <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  doc.status === 'verified'
                    ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                }`}>
                  {doc.status === 'verified' ? 'Verified' : 'Pending'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
