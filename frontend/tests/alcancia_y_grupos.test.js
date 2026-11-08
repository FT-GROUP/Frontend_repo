import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { financeApi } from '../src/services/financeApi.js'
import { adminApi } from '../src/services/adminApi.js'

const demoUser = {
  id: 'u-demo-test',
  nombre: 'Usuario Prueba',
  email: 'usuario@ftgroup.test',
}

describe('Alcancía compartida y Admin - Grupos de grupos', () => {
  it('inicializa alcancías y agrupaciones por defecto en los grupos del usuario', async () => {
    const grupos = await financeApi.groups(demoUser)
    assert.ok(grupos.length >= 3, 'Debe cargar al menos los 3 grupos de demostración')
    const apto = grupos.find(g => g.id === 'g-apto')
    assert.ok(apto, 'Debe existir el grupo g-apto')
    assert.ok(apto.alcancia, 'El grupo debe incluir el objeto alcancia')
    assert.ok(apto.alcancia.meta > 0, 'La alcancía debe tener una meta configurada')
    assert.ok(apto.alcancia.ahorrado > 0, 'La alcancía debe tener un saldo ahorrado inicial')
    assert.ok(apto.agrupacion?.nombre, 'El grupo debe estar vinculado a una agrupación maestra')
  })

  it('permite aportar a la alcancía y configurar una nueva meta de ahorro', async () => {
    const antes = (await financeApi.groups(demoUser)).find(g => g.id === 'g-apto').alcancia.ahorrado
    const actualizado = await financeApi.contributeAlcancia(demoUser, 'g-apto', {
      monto: 50000,
      nota: 'Aporte extraordinario test',
    })
    assert.equal(actualizado.ahorrado, antes + 50000)

    const nuevaMeta = await financeApi.configureAlcancia(demoUser, 'g-apto', {
      nombre: 'Fondo remodelación cocina',
      meta: 1000000,
    })
    assert.equal(nuevaMeta.nombre, 'Fondo remodelación cocina')
    assert.equal(nuevaMeta.meta, 1000000)
  })

  it('permite listar y crear Grupos de grupos (Agrupaciones maestras) en Administración', async () => {
    const overview = await adminApi.groupsOverview()
    assert.ok(Array.isArray(overview.agrupaciones), 'Debe retornar lista de agrupaciones')
    assert.ok(Array.isArray(overview.grupos), 'Debe retornar lista de grupos')
    assert.ok(overview.agrupaciones.length >= 3, 'Debe contar con agrupaciones iniciales')

    const creada = await adminApi.createMacroGroup({
      nombre: 'Proyectos Especiales 2026',
      descripcion: 'Agrupación de prueba para sustentación',
      color: '#d97706',
      grupoIds: [1, 2],
    })
    assert.equal(creada.nombre, 'Proyectos Especiales 2026')
    assert.equal(creada.totalGrupos, 2)
  })
})

