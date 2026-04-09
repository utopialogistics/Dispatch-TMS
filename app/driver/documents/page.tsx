'use client'

import { useState } from 'react'
import DocumentsView from '../components/DocumentsView'
import type { UploadedDocument } from '../types'
import { SAMPLE_DOCUMENTS } from '../constants'

export default function DocumentsPage() {
  const [documents] = useState<UploadedDocument[]>(SAMPLE_DOCUMENTS)

  return <DocumentsView documents={documents} />
}
