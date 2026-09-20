import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault(); setError(''); setSending(true)
    try {
      const user = await authApi.login(email, password)
      onLogin(user); navigate('/dashboard')
    } catch (err) { setError(err.message) }
    finally { setSending(false) }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="logo">FT.<span>GROUP</span></div>
      <h1>Bienvenido</h1>
      <p className="muted">Inicia sesión para administrar tus gastos compartidos.</p>
      {error && <div className="alert">{error}</div>}
      <form className="form" onSubmit={submit}>
        <div className="field"><label>Correo electrónico</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
        <div className="field"><label>Contraseña</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
        <button className="btn btn-primary" disabled={sending}>{sending ? 'Ingresando...' : 'Iniciar sesión'}</button>
      </form>
      <div className="auth-footer">¿No tienes cuenta? <Link className="link" to="/registro">Crear cuenta</Link></div>
    </section>
  </main>
}
