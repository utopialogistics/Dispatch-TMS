'use client'

import { useState } from 'react'
import { useDriver } from '../DriverContext'
import MessagesView from '../components/MessagesView'
import type { ChatMessage } from '../types'
import { SAMPLE_MESSAGES } from '../constants'

export default function MessagesPage() {
  const { name } = useDriver()
  const [messages, setMessages] = useState<ChatMessage[]>(SAMPLE_MESSAGES)

  function handleSend(content: string) {
    const msg: ChatMessage = {
      id:       `msg-${Date.now()}`,
      fromName: name,
      fromRole: 'driver',
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, msg])
    // Wire to Firestore in production
  }

  return <MessagesView messages={messages} driverName={name} onSend={handleSend} />
}
