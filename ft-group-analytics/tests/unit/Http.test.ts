import jwt from 'jsonwebtoken';
import request from 'supertest';
import { crearApp } from '../../src/app';
import { env } from '../../src/infrastructure/config/env';

const token = jwt.sign({ usuarioId: 1, email: 'a@a.com' }, env.jwtSecret, { expiresIn: '5m' });

describe('API HTTP (sin base de datos: solo validaciones y seguridad)', () => {
  const app = crearApp();

  it('/health responde ok', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.servicio).toBe('ft-group-analytics');
  });

  it('exige token en las rutas de analitica', async () => {
    expect((await request(app).get('/api/analitica/kpis')).status).toBe(401);
    expect((await request(app).get('/api/analitica/predicciones').set('Authorization', 'Bearer falso')).status).toBe(401);
    const firmadoConOtroSecreto = jwt.sign({ usuarioId: 1, email: 'a@a.com' }, 'otro-secreto');
    expect((await request(app).get('/api/analitica/kpis').set('Authorization', `Bearer ${firmadoConOtroSecreto}`)).status).toBe(401);
  });

  it('valida los parametros de la consulta', async () => {
    const h = { Authorization: `Bearer ${token}` };
    const a = await request(app).get('/api/analitica/kpis?meses=99').set(h);
    expect(a.status).toBe(400);
    expect(a.body.mensaje).toMatch(/meses/);
    expect((await request(app).get('/api/analitica/predicciones?horizonte=0').set(h)).status).toBe(400);
    expect((await request(app).get('/api/analitica/kpis?grupoId=abc').set(h)).status).toBe(400);
  });

  it('responde 404 para rutas inexistentes', async () => {
    expect((await request(app).get('/api/otra-cosa')).status).toBe(404);
  });
});
