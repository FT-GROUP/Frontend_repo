import { useState } from 'react'
import { authApi } from '../services/authApi'
import { Alert } from './ui'
import Icon from './Icon'
import { PASSWORD_RULES, passwordError } from '../utils/passwordPolicy'

/**
 * Formulario para cambiar la contraseña. Se usa en el perfil y, en modo
 * obligatorio, cuando la cuenta tiene una contraseña que no cumple la política.
 */
export default function ChangePassword({ user, onChanged, forced = false }) {
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [msg, setMsg] = useState({ type: 'error', text: '' })
  const [sending, setSending] = useState(false)
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
    e.preventDefault()
    setMsg({ type: 'error', text: '' })
    const error = passwordError(form.nueva)
    if (error) return setMsg({ type: 'error', text: error })
    if (form.nueva !== form.confirmar) return setMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' })
    if (form.nueva === form.actual) return setMsg({ type: 'error', text: 'La nueva contraseña debe ser distinta de la actual.' })
    setSending(true)
    try {
      const actualizado = await authApi.changePassword(user.email, form.actual, form.nueva)
      setForm({ actual: '', nueva: '', confirmar: '' })
      setMsg({ type: 'success', text: 'Contraseña actualizada. Las demás sesiones abiertas se cerraron.' })
      onChanged?.(actualizado)
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {forced && (
        <Alert type="warning">
          Tu contraseña actual no cumple la política de seguridad. Para seguir usando FT. GROUP debes cambiarla.
        </Alert>
      )}
      <Alert type={msg.type}>{msg.text}</Alert>
      <div className="field">
        <label htmlFor="cp-actual">Contraseña actual</label>
        <input id="cp-actual" name="actual" type="password" value={form.actual} onChange={change} autoComplete="current-password" maxLength={72} required />
      </div>
      <div className="field">
        <label htmlFor="cp-nueva">Nueva contraseña</label>
        <input id="cp-nueva" name="nueva" type="password" value={form.nueva} onChange={change} autoComplete="new-password" maxLength={72} required />
      </div>
      <div className="field">
        <label htmlFor="cp-confirmar">Confirmar nueva contraseña</label>
        <input id="cp-confirmar" name="confirmar" type="password" value={form.confirmar} onChange={change} autoComplete="new-password" maxLength={72} required />
      </div>
      <ul className="password-rules" aria-label="Requisitos de la contraseña">
        {PASSWORD_RULES.map(rule => {
          const ok = rule.test(form.nueva)
          return (
            <li key={rule.id} className={ok ? 'ok' : ''}>
              <Icon name={ok ? 'check' : 'dot'} size={13} /> {rule.label}
            </li>
          )
        })}
      </ul>
      <button className="btn btn-primary" disabled={sending}>{sending ? 'Guardando…' : 'Cambiar contraseña'}</button>
    </form>
  )
}
