import { useEffect, useRef, useState } from 'react'
import { obtenerRespuestaChatbot, RESPUESTA_SIN_COINCIDENCIA } from '../utils/chatbot'
import Icon from './Icon'

const WELCOME = {
  role: 'assistant',
  content: '¡Hola! Soy el chatbot de FT. GROUP. Puedo ayudarte con respuestas rápidas sobre cómo usar la aplicación. ¿Qué necesitas saber?',
}
const SUGGESTIONS = [
  '¿Cómo creo un grupo?',
  '¿Cómo divido un gasto?',
  '¿Cómo registro un pago?',
]

export default function HelpAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [draft, setDraft] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    inputRef.current?.focus()
  }, [messages, open])

  function send(text = draft) {
    const question = text.trim()
    if (!question) return

    setDraft('')
    setMessages(current => [
      ...current,
      { role: 'user', content: question },
      { role: 'assistant', content: obtenerRespuestaChatbot(question) },
    ])
  }

  const mostrarSugerencias = messages.length === 1 || messages.at(-1)?.content === RESPUESTA_SIN_COINCIDENCIA

  return (
    <div className="help-assistant">
      {open && (
        <section className="assistant-panel" role="dialog" aria-label="Chatbot de ayuda">
          <header className="assistant-head">
            <span className="assistant-mark"><Icon name="sparkles" size={18} /></span>
            <span className="assistant-heading">
              <strong>Chatbot FT. GROUP</strong>
              <small>Ayuda rápida · respuestas automáticas</small>
            </span>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar asistente">
              <Icon name="close" />
            </button>
          </header>

          <div className="assistant-messages" ref={listRef} aria-live="polite">
            {messages.map((message, index) => (
              <p key={`${index}-${message.role}`} className={`assistant-message assistant-${message.role}`}>
                {message.content}
              </p>
            ))}
            {mostrarSugerencias && (
              <div className="assistant-suggestions">
                {SUGGESTIONS.map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => send(suggestion)}>{suggestion}</button>
                ))}
              </div>
            )}
          </div>

          <form className="assistant-form" onSubmit={event => { event.preventDefault(); send() }}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
              maxLength={500}
              rows={2}
              placeholder="Escribe tu pregunta…"
              aria-label="Escribe tu pregunta"
            />
            <button className="btn btn-primary assistant-send" type="submit" disabled={!draft.trim()} aria-label="Enviar pregunta">
              <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="assistant-disclaimer">Chatbot de preguntas frecuentes; no accede a tus datos.</p>
        </section>
      )}
      <button
        className={`assistant-toggle${open ? ' assistant-toggle-open' : ''}`}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label={open ? 'Cerrar asistente de ayuda' : 'Abrir asistente de ayuda'}
        aria-expanded={open}
      >
        <Icon name={open ? 'close' : 'sparkles'} size={21} />
        <span>{open ? 'Cerrar' : 'Ayuda'}</span>
      </button>
    </div>
  )
}
