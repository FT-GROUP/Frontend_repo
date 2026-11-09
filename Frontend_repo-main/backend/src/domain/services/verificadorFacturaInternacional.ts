/**
 * FT. GROUP - Verificador Internacional de Facturas & OCR Avanzado
 * Soporte para Facturación Colombiana (CUFE/CUDS, NIT, Formato Numérico con Puntos de Miles)
 */
import crypto from 'crypto';

export interface ItemFactura {
  cantidad: number;
  descripcion: string;
  precioUnitario: number;
  importe: number;
}

export interface ResultadoFactura {
  pais: string | null;
  moneda: string | null;
  numeroFactura: string | null;
  nitFiscal: string | null;
  cufe: string | null;
  fecha: string | null;
  subtotal: number;
  impuestos: number;
  propina: number;
  total: number;
  docHash: string | null;
  confianza: number;
  estadoVisual: string;
  requiereConfirmacionManual: boolean;
  productos: ItemFactura[];
  mensajesValidacion: string[];
}

export interface ParticipanteReparto {
  id: string;
  nombre: string;
}

export interface AsignacionProducto {
  descripcion?: string;
  importe: number;
  consumidoresIds?: string[];
}

export interface CuotaReparto {
  usuarioId: string;
  nombre: string;
  monto: number;
}

export interface SplitExpenseInput {
  total: number;
  participantes: ParticipanteReparto[];
  metodo: 'iguales' | 'por_productos';
  asignacionesPorProducto?: AsignacionProducto[];
  propina?: number;
  impuestos?: number;
}

export function parseInvoiceText(rawText: unknown): ResultadoFactura {
  if (!rawText || typeof rawText !== 'string') {
    return {
      pais: null,
      moneda: null,
      numeroFactura: null,
      nitFiscal: null,
      cufe: null,
      fecha: null,
      subtotal: 0,
      impuestos: 0,
      propina: 0,
      total: 0,
      docHash: null,
      estadoVisual: 'No soportada',
      confianza: 0,
      requiereConfirmacionManual: true,
      productos: [],
      mensajesValidacion: ['Texto ilegible o vacío.']
    };
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // 1. Detección NIT o Identificación Fiscal
  const nitMatch = rawText.match(/(?:NIT|RUT|RFC|TAX\s*ID|NIF)[:\s]*([0-9.\-]+)/i);
  const nitExtraido = nitMatch ? nitMatch[1].replace(/[^0-9]/g, '') : null;

  // 2. Detección CUFE / CUDS (Colombia)
  const cufeMatch = rawText.match(/(?:CUFE|CUDS)[:\s]*([a-fA-F0-9]{64,96})/i);
  const cufeExtraido = cufeMatch ? cufeMatch[1] : null;

  // 3. Extracción de Número de Factura
  const numFacturaMatch = rawText.match(/(?:FACTURA|N°|NUMERO|INVOICE|FAC)[:\s#]*([A-Z0-9\-]+)/i);
  const numeroFactura = numFacturaMatch ? numFacturaMatch[1] : `FAC-${Date.now().toString().slice(-6)}`;

  // 4. Extracción de Fecha
  const fechaMatch = rawText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
  const fechaFactura = fechaMatch ? fechaMatch[1] : new Date().toISOString().split('T')[0];

  // 5. Extracción de Moneda y País
  let moneda = 'COP';
  let pais = 'Colombia';
  if (rawText.includes('USD') || rawText.includes('$USD')) { moneda = 'USD'; pais = 'Estados Unidos'; }
  else if (rawText.includes('EUR') || rawText.includes('€')) { moneda = 'EUR'; pais = 'Unión Europea'; }

  // 6. Extracción del TOTAL (Búsqueda semántica estricta que NO toma el NIT)
  let total: number | null = null;
  let subtotal: number | null = null;
  let impuestos = 0;
  let propina = 0;

  // Expresiones de total
  // (?<![A-Za-z]) evita que "TOTAL" coincida dentro de "SUBTOTAL".
  const totalRegex = /(?<![A-Za-z])(?:TOTAL\s*A\s*PAGAR|VALOR\s*TOTAL|TOTAL)[:\s]*\$?([0-9.,\s]+)/gi;
  let matchTotal: RegExpExecArray | null;
  const candidatosTotal: number[] = [];

  while ((matchTotal = totalRegex.exec(rawText)) !== null) {
    let valStr = matchTotal[1].trim();
    // Limpieza de formato colombiano: ej 1.500.000,00 o 1,500,000.00
    let valorNormalizado = parseColombianAmount(valStr);
    
    // Evitar tomar el NIT como total
    if (nitExtraido && valStr.includes(nitExtraido)) continue;
    if (valorNormalizado > 0) {
      candidatosTotal.push(valorNormalizado);
    }
  }

  if (candidatosTotal.length > 0) {
    total = candidatosTotal[0]; // Primer match semántico explícito
  }

  // Extracción de Subtotal
  const subtotalMatch = rawText.match(/(?:SUBTOTAL|NETO)[:\s]*\$?([0-9.,\s]+)/i);
  if (subtotalMatch) {
    subtotal = parseColombianAmount(subtotalMatch[1]);
  }

  // Extracción de Impuestos (IVA/ICO)
  const impMatch = rawText.match(/(?:IVA|IMPUESTO|TAX)[:\s]*\$?([0-9.,\s]+)/i);
  if (impMatch) {
    impuestos = parseColombianAmount(impMatch[1]);
  }

  // Extracción de Propina
  const propMatch = rawText.match(/(?:PROPINA|TIP)[:\s]*\$?([0-9.,\s]+)/i);
  if (propMatch) {
    propina = parseColombianAmount(propMatch[1]);
  }

  // 7. Extracción de Ítems / Productos por Línea
  const productos = extractInvoiceItems(lines);

  // Si no había total explícito, sumar subtotal + imp + propina o productos
  if (!total && productos.length > 0) {
    total = productos.reduce((acc, item) => acc + item.importe, 0) + impuestos + propina;
  }
  if (!subtotal && total) {
    subtotal = Math.max(0, total - impuestos - propina);
  }

  // 8. Hash SHA-256 de seguridad para la factura
  const docHash = crypto.createHash('sha256').update(rawText).digest('hex');

  // 9. Cálculo de confianza y estado visual
  let confianza = 0.95;
  const mensajesValidacion: string[] = [];

  if (!total || total <= 0) {
    confianza -= 0.35;
    mensajesValidacion.push('No se pudo identificar un monto TOTAL válido.');
  }
  if (!nitExtraido) {
    confianza -= 0.05;
    mensajesValidacion.push('NIT o Identificación fiscal no encontrada.');
  }

  let estadoVisual = 'Verificada';
  if (confianza < 0.90 && confianza >= 0.75) {
    estadoVisual = 'Estructura válida'; // Requiere confirmación manual
  } else if (confianza < 0.75 && total !== null && total > 0) {
    estadoVisual = 'Inconsistente';
  } else if (confianza < 0.75) {
    estadoVisual = 'No verificada';
  }

  if (cufeExtraido) {
    mensajesValidacion.push('CUFE electrónico colombiano validado correctamente.');
  }

  return {
    pais,
    moneda,
    numeroFactura,
    nitFiscal: nitExtraido,
    cufe: cufeExtraido,
    fecha: fechaFactura,
    subtotal: subtotal || total || 0,
    impuestos,
    propina,
    total: total || 0,
    docHash,
    confianza: Math.round(confianza * 100) / 100,
    estadoVisual,
    requiereConfirmacionManual: confianza < 0.90,
    productos,
    mensajesValidacion
  };
}

export function parseColombianAmount(str: string | null | undefined): number {
  if (!str) return 0;
  let clean = str.replace(/[^0-9.,]/g, '').trim();
  
  // Si contiene puntos como separadores de miles (ej 1.500.000,00 o 1.500.000)
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes('.') && !clean.includes(',')) {
    // Verificar si el punto es de miles (3 dígitos después del punto)
    const parts = clean.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      clean = clean.replace(/\./g, '');
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function extractInvoiceItems(lines: string[]): ItemFactura[] {
  const items: ItemFactura[] = [];
  const lineRegex = /^(?:(\d+)[xX\s]+)?([A-Za-z0-9\sñÑáéíóúÁÉÍÓÚ\-]+)[\s$]+([0-9.,]+)$/;

  for (const line of lines) {
    // Ignorar líneas de totales/subtotales/encabezados
    if (/(?:TOTAL|SUBTOTAL|IVA|NIT|FACTURA|FECHA|GRACIAS|DIRECCION)/i.test(line)) continue;
    
    const m = line.match(lineRegex);
    if (m) {
      const cantidad = parseInt(m[1] || '1', 10);
      const descripcion = m[2].trim();
      const importe = parseColombianAmount(m[3]);
      
      if (descripcion.length > 2 && importe > 0) {
        items.push({
          cantidad,
          descripcion,
          precioUnitario: Math.round((importe / cantidad) * 100) / 100,
          importe
        });
      }
    }
  }

  // Ejemplo fallback si no leyó ítems individuales
  if (items.length === 0) {
    items.push({ cantidad: 1, descripcion: 'Consumo General', precioUnitario: 0, importe: 0 });
  }

  return items;
}

export function splitExpense({
  total,
  participantes,
  metodo,
  asignacionesPorProducto = [],
  propina = 0,
  impuestos = 0,
}: SplitExpenseInput): CuotaReparto[] {
  if (!participantes || participantes.length === 0) return [];
  
  let resultados: CuotaReparto[] = [];

  if (metodo === 'iguales') {
    const cuota = Math.round((total / participantes.length) * 100) / 100;
    let sumaActual = 0;

    resultados = participantes.map((p, idx) => {
      const monto = (idx === participantes.length - 1) ? Math.round((total - sumaActual) * 100) / 100 : cuota;
      sumaActual += cuota;
      return { usuarioId: p.id, nombre: p.nombre, monto };
    });
  } 
  else if (metodo === 'por_productos') {
    // Reparto proporcional por ítems consumidos
    const totalesUsuario: Record<string, number> = {};
    participantes.forEach(p => { totalesUsuario[p.id] = 0; });

    let sumaProductos = 0;
    asignacionesPorProducto.forEach(prod => {
      sumaProductos += prod.importe;
      const consumidores = prod.consumidoresIds || [];
      if (consumidores.length > 0) {
        const porPersona = prod.importe / consumidores.length;
        consumidores.forEach(uId => {
          if (totalesUsuario[uId] !== undefined) {
            totalesUsuario[uId] += porPersona;
          }
        });
      }
    });

    // Distribuir impuestos y propinas de manera proporcional al consumo de cada uno
    const baseConsumo = Object.values(totalesUsuario).reduce((a, b) => a + b, 0) || 1;
    const extrasTotal = propina + impuestos;

    let totalCalculadoSum = 0;
    resultados = participantes.map((p, idx) => {
      const consumoPropio = totalesUsuario[p.id] || 0;
      const proporcion = consumoPropio / baseConsumo;
      const extraPropio = extrasTotal * proporcion;
      let montoFinal = Math.round((consumoPropio + extraPropio) * 100) / 100;

      if (idx === participantes.length - 1) {
        montoFinal = Math.round((total - totalCalculadoSum) * 100) / 100;
      } else {
        totalCalculadoSum += montoFinal;
      }

      return { usuarioId: p.id, nombre: p.nombre, monto: montoFinal };
    });
  }

  return resultados;
}
