import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { collection, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { storage, db } from '@/lib/firebase'

export const DOCUMENT_TYPES = [
  "Driver's License",
  'Passport',
  'PR Card',
  'Work Permit',
  'SIN Card',
  'Medical Certificate',
  'FAST Card',
  'TWIC Card',
  'Hazmat Certificate',
  'Abstract (Driver Record)',
  'Vehicle Registration',
  'Insurance Certificate',
  'Other',
]

export const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const MAX_IMAGE_DIMENSION = 1800
const IMAGE_QUALITY = 0.72

export type OptimizedUpload = {
  file: File
  compressed: boolean
  originalSize: number
}

export type UploadedDriverDocument = {
  id: string
  name: string
  type: string
  fileName: string
  storagePath: string
  downloadURL: string
  expiryDate: string | null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image for compression.'))
    image.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function makeJpegName(name: string): string {
  return name.replace(/\.[^.]+$/, '') + '.jpg'
}

export async function optimizeDriverUpload(file: File): Promise<OptimizedUpload> {
  if (!file.type.startsWith('image/')) {
    return { file, compressed: false, originalSize: file.size }
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return { file, compressed: false, originalSize: file.size }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, 'image/jpeg', IMAGE_QUALITY)
    if (!blob || blob.size >= file.size) {
      return { file, compressed: false, originalSize: file.size }
    }

    return {
      file: new File([blob], makeJpegName(file.name), {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }),
      compressed: true,
      originalSize: file.size,
    }
  } catch {
    return { file, compressed: false, originalSize: file.size }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function uploadDriverDocument(params: {
  uid: string
  file: File
  name: string
  type: string
  expiryDate?: string
  uploadedBy?: string
}): Promise<UploadedDriverDocument> {
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `${Date.now()}_${safeName}`
  const storagePath = `drivers/${params.uid}/documents/${fileName}`

  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, params.file)
  const downloadURL = await getDownloadURL(storageRef)

  const docData = {
    name: params.name || params.file.name,
    type: params.type || 'Other',
    fileName: params.file.name,
    storagePath,
    downloadURL,
    uploadedAt: Timestamp.now(),
    expiryDate: params.expiryDate || null,
    status: 'pending',
    uploadedBy: params.uploadedBy || '',
  }

  const docRef = await addDoc(collection(db, 'users', params.uid, 'documents'), docData)

  return {
    id: docRef.id,
    name: docData.name,
    type: docData.type,
    fileName: docData.fileName,
    storagePath: docData.storagePath,
    downloadURL: docData.downloadURL,
    expiryDate: docData.expiryDate,
  }
}

export async function deleteDriverDocument(params: {
  uid: string
  docId: string
  storagePath?: string
}): Promise<void> {
  if (params.storagePath) {
    try {
      await deleteObject(ref(storage, params.storagePath))
    } catch {
      // Storage file may already be gone — still delete the Firestore record
    }
  }
  await deleteDoc(doc(db, 'users', params.uid, 'documents', params.docId))
}
