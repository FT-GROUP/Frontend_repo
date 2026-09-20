import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'

export default function Register() {
  const [form, setForm] = useState({ nombre:'', email:'', password:'', telefono:'' })
  const [error, setError] = useState(''); const [ok, setOk] = useState('')
  const [sending, setSending] = useState(false); const navigate = useNavigate()
  const change = e => setForm({...form, [e.target.name]: e.target.value})
  const submit = async e => {
    e.preventDefault(); setError(''); setOk(''); setSending(true)
    try {
      await authApi.register(form)
      setOk('Cuenta creada correctamente. Ahora puedes iniciar sesión.')
      setTimeout(() => navigate('/login'), 900)
    } catch (err) { setError(err.message) }
    finally { setSending(false) }
  }
  return <main className="auth-page">
    <section className="auth-card">
      <div className="logo">FT.<span>GROUP</span></div><h1>Crear cuenta</h1>
      <p className="muted">Regístrate para comenzar.</p>
      {error && <div className="alert">{error}</div>}{ok && <div className="alert" style={{background:'#ecfdf5',color:'#166534'}}>{ok}</div>}
      <form className="form" onSubmit={submit}>
        <div className="field"><label>Nombre</label><input name="nombre" value={form.nombre} onChange={change} minLength="2" required /></div>
        <div className="field"><label>Correo electrónico</label><input type="email" name="email" value={form.email} onChange={change} required /></div>
        <div className="field"><label>Teléfono (opcional)</label><input name="telefono" value={form.telefono} onChange={change} /></div>
        <div className="field"><label>Contraseña</label><input type="password" name="password" value={form.password} onChange={change} minLength="8" required /></div>
        <button className="btn btn-primary" disabled={sending}>{sending ? 'Creando...' : 'Crear cuenta'}</button>
      </form>
      <div className="auth-footer">¿Ya tienes cuenta? <Link className="link" to="/login">Iniciar sesión</Link></div>
    </section>
  </main>
}
