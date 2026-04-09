'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  driverName: string
  onSend: (content: string) => void
}

export default function MessagesView({ messages, driverName, onSend }: Props) {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  function formatTime(ts: string) {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">Dispatch Messages</h2>
        <p className="text-xs text-zinc-500">Chat with your dispatch team</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => {
          const isDriver = msg.fromRole === 'driver'
          return (
            <div key={msg.id} className={`flex ${isDriver ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm lg:max-w-md ${
                isDriver
                  ? 'bg-zinc-900 text-white rounded-br-none'
                  : 'bg-zinc-100 text-zinc-900 rounded-bl-none'
              }`}>
                {!isDriver && (
                  <p className="mb-0.5 text-xs font-semibold text-zinc-500">{msg.fromName}</p>
                )}
                <p>{msg.content}</p>
                <p className={`mt-1 text-right text-xs ${isDriver ? 'text-zinc-400' : 'text-zinc-400'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-zinc-100 px-4 py-3 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 focus:ring-0"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
