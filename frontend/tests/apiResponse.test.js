import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrayFromResponse } from '../src/utils/apiResponse.js'

test('acepta listas directas y listas envueltas por el backend', () => {
  const items = [{ id: 1 }]
  assert.equal(arrayFromResponse(items, ['grupos'], '/grupos'), items)
  assert.equal(arrayFromResponse({ grupos: items }, ['grupos'], '/grupos'), items)
})

test('acepta los nombres alternativos definidos para una lista', () => {
  const items = [{ id: 1 }]
  assert.equal(arrayFromResponse({ movimientos: items }, ['historial', 'movimientos'], '/historial'), items)
})

test('informa claramente cuando la respuesta no contiene una lista', () => {
  assert.throws(
    () => arrayFromResponse({ grupos: { items: [] } }, ['grupos'], '/grupos'),
    /lista inválida para \/grupos/,
  )
})
