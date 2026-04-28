// ============================================================
// MEDIMPOR — Sistema de Gestión Integral
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from './supabaseClient';

// ─── COLORES ──────────────────────────────────────────────────
const C = {
  navy: '#0D2E4F',
  blue: '#185FA5',
  blueLight: '#E6F1FB',
  green: '#27500A',
  greenMid: '#3B6D11',
  greenLight: '#EAF3DE',
  amber: '#633806',
  amberMid: '#854F0B',
  amberLight: '#FAEEDA',
  red: '#791F1F',
  redLight: '#FCEBEB',
  purple: '#3C3489',
  purpleLight: '#EEEDFE',
  gray: '#444441',
  grayLight: '#F1EFE8',
  white: '#FFFFFF',
  border: 'rgba(0,0,0,0.1)',
};
// ─── DATOS INICIALES (Se cargarán de Supabase si existen) ───
const INIT_PRODUCTOS = [];
const INIT_VENTAS = [];
const INIT_LOTES = [];
const INIT_CAJA = [];
// ─── UTILIDADES ───────────────────────────────────────────────
const formatBs = (n) =>
  `Bs ${Number(n || 0).toLocaleString('es-BO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
const formatPct = (n) => `${(Number(n || 0) * 100).toFixed(1)}%`;
const today = () => new Date().toISOString().split('T')[0];
const monthYear = (d) => d.slice(0, 7);
const curMonth = monthYear(today());

function useSupabaseTable(tableName, initialData) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: dbData, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && dbData && dbData.length > 0) {
        setData(dbData);
      } else {
        if (initialData && initialData.length > 0) {
          // Solo insertar si la tabla está vacía
          // Nota: esto es una simplificación, en prod se haría una comprobación mejor
        }
      }
      setLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel(`${tableName}_channel`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          // Actualizar datos en tiempo real es complejo con estructuras locales,
          // por ahora refrescamos al montar o podrías implementar lógica de sync aquí
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName]);

  return [data, setData, loading];
}

// ─── COMPONENTES BASE ─────────────────────────────────────────
function Badge({ children, color = 'gray' }) {
  const map = {
    green: { bg: C.greenLight, text: C.green },
    red: { bg: C.redLight, text: C.red },
    amber: { bg: C.amberLight, text: C.amber },
    blue: { bg: C.blueLight, text: C.blue },
    purple: { bg: C.purpleLight, text: C.purple },
    gray: { bg: C.grayLight, text: C.gray },
  };
  const s = map[color] || map.gray;
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 20,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function KpiCard({ label, value, sub, subColor }) {
  return (
    <div
      style={{
        background: '#fff',
        border: `0.5px solid ${C.border}`,
        borderRadius: 10,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{ fontSize: 22, fontWeight: 600, color: C.navy, lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, marginTop: 5, color: subColor || '#888' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: '#fff',
        border: `0.5px solid ${C.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHead({ title, badge, badgeColor }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderBottom: `0.5px solid ${C.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>
        {title}
      </span>
      {badge && <Badge color={badgeColor}>{badge}</Badge>}
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', style, disabled }) {
  const base = {
    border: 'none',
    borderRadius: 8,
    padding: '9px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.15s',
    ...style,
  };
  const v = {
    primary: { background: C.navy, color: '#fff' },
    secondary: {
      background: C.grayLight,
      color: C.gray,
      border: `0.5px solid ${C.border}`,
    },
    danger: { background: C.redLight, color: C.red },
    success: { background: C.greenLight, color: C.green },
  };
  return (
    <button
      style={{ ...base, ...v[variant] }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  list,
  required,
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <div
          style={{
            fontSize: 11,
            color: '#666',
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          {label}
          {required && ' *'}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={list}
        style={{
          width: '100%',
          border: `0.5px solid ${C.border}`,
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 13,
          color: C.navy,
          background: '#fafafa',
          outline: 'none',
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <div
          style={{
            fontSize: 11,
            color: '#666',
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          {label}
          {required && ' *'}
        </div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          border: `0.5px solid ${C.border}`,
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 13,
          color: C.navy,
          background: '#fafafa',
        }}
      >
        <option value="">— Seleccionar —</option>
        {options.map((o) => (
          <option key={o.value || o} value={o.value || o}>
            {o.label || o}
          </option>
        ))}
      </select>
    </div>
  );
}

function StockBadge({ stock, min }) {
  if (stock === 0) return <Badge color="red">AGOTADO</Badge>;
  if (stock <= min) return <Badge color="red">CRÍTICO</Badge>;
  if (stock <= min * 1.5) return <Badge color="amber">BAJO</Badge>;
  return <Badge color="green">OK</Badge>;
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `0.5px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            background: '#fff',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#aaa',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── SECCIÓN: DASHBOARD ───────────────────────────────────────
function Dashboard({ productos, ventas, caja }) {
  const hoy = today();
  const ventasHoy = ventas.filter((v) => v.fecha === hoy);
  const ventasMes = ventas.filter((v) => v.fecha?.startsWith(curMonth));
  const totalHoy = ventasHoy.reduce((a, v) => a + v.total, 0);
  const totalMes = ventasMes.reduce((a, v) => a + v.total, 0);
  const costoMes = ventasMes.reduce((a, v) => a + v.costo * v.cantidad, 0);
  const margenMes = totalMes > 0 ? (totalMes - costoMes) / totalMes : 0;
  const saldoCaja = caja.reduce(
    (a, m) => (m.tipo === 'Ingreso' ? a + m.monto : a - m.monto),
    0
  );
  const criticos = productos.filter((p) => p.stock <= p.stockMin);

  const ventasPorCat = ['Celular', 'Accesorio', 'Componente PC'].map((cat) => ({
    cat: cat === 'Componente PC' ? 'Comp. PC' : cat,
    total: ventasMes
      .filter((v) => v.categoria === cat)
      .reduce((a, v) => a + v.total, 0),
  }));

  const ultimas7 = [...ventas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 7);
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    chartData.push({
      dia: ds.slice(5),
      total: ventas
        .filter((v) => v.fecha === ds)
        .reduce((a, v) => a + v.total, 0),
    });
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>
          Dashboard ejecutivo
        </h2>
        <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
          Datos en tiempo real ·{' '}
          {new Date().toLocaleDateString('es-BO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <KpiCard
          label="Ventas hoy"
          value={formatBs(totalHoy)}
          sub={`${ventasHoy.length} transacciones`}
        />
        <KpiCard
          label="Ventas del mes"
          value={formatBs(totalMes)}
          sub={`${ventasMes.length} ventas`}
        />
        <KpiCard
          label="Margen bruto mes"
          value={formatPct(margenMes)}
          subColor={margenMes > 0.25 ? C.green : C.red}
          sub={margenMes > 0.25 ? '↑ Bueno' : '↓ Revisar'}
        />
        <KpiCard
          label="Saldo en caja"
          value={formatBs(saldoCaja)}
          sub="Todas las formas de pago"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Card>
          <CardHead title="Ventas últimos 7 días" />
          <div style={{ padding: '12px 4px' }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatBs(v)} />
                <Bar dataKey="total" fill={C.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHead title="Ventas por categoría (mes)" />
          <div style={{ padding: '12px 4px' }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={ventasPorCat}
                layout="vertical"
                margin={{ left: 8, right: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  horizontal={false}
                />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  dataKey="cat"
                  type="category"
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip formatter={(v) => formatBs(v)} />
                <Bar dataKey="total" fill={C.greenMid} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <CardHead
            title="Últimas ventas"
            badge={`${ventasHoy.length} hoy`}
            badgeColor="blue"
          />
          {ultimas7.map((v) => (
            <div
              key={v.id}
              style={{
                padding: '9px 14px',
                borderBottom: `0.5px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.navy, fontWeight: 500 }}>
                  {v.producto}
                </div>
                <div style={{ fontSize: 10, color: '#888' }}>
                  {v.vendedor.split(' ')[0]} · {v.fecha}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>
                  {formatBs(v.total)}
                </div>
                <Badge
                  color={
                    v.pago === 'Efectivo'
                      ? 'green'
                      : v.pago === 'QR'
                      ? 'blue'
                      : 'purple'
                  }
                >
                  {v.pago}
                </Badge>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <CardHead
            title="Semáforo de stock"
            badge={
              criticos.length > 0 ? `${criticos.length} críticos` : 'Todo OK'
            }
            badgeColor={criticos.length > 0 ? 'red' : 'green'}
          />
          {productos.slice(0, 8).map((p) => (
            <div
              key={p.id}
              style={{
                padding: '8px 14px',
                borderBottom: `0.5px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.navy }}>{p.nombre}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{p.categoria}</div>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500 }}>
                  {p.stock} u.
                </span>
                <StockBadge stock={p.stock} min={p.stockMin} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── SECCIÓN: VENTAS ──────────────────────────────────────────
function Ventas({ productos, ventas, setVentas, setProductos, setCaja }) {
  const [modal, setModal] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [form, setForm] = useState({
    fecha: today(),
    vendedor: '',
    cliente: '',
    productoId: '',
    cantidad: 1,
    precioUnit: '',
    pago: '',
  });
  const [prodSel, setProdSel] = useState(null);

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const p = productos.find((x) => x.id === form.productoId);
    setProdSel(p || null);
    if (p) f('precioUnit', p.precioRef);
  }, [form.productoId]);

  const margenCalc = prodSel ? form.precioUnit - prodSel.costo : 0;
  const totalCalc = form.precioUnit * form.cantidad;

  const guardar = () => {
    if (
      !form.vendedor ||
      !form.cliente ||
      !form.productoId ||
      !form.precioUnit ||
      !form.pago
    )
      return alert('Completa todos los campos');
    if (!prodSel || prodSel.stock < form.cantidad)
      return alert('Stock insuficiente');
    const id = `VTA-${String(ventas.length + 1).padStart(4, '0')}`;
    const nueva = {
      ...form,
      id,
      producto: prodSel.nombre,
      categoria: prodSel.categoria,
      total: totalCalc,
      costo: prodSel.costo,
      margen: margenCalc,
      cantidad: Number(form.cantidad),
      precioUnit: Number(form.precioUnit),
    };
    setVentas((p) => [nueva, ...p]);
    setProductos((p) =>
      p.map((x) =>
        x.id === prodSel.id
          ? { ...x, stock: x.stock - Number(form.cantidad) }
          : x
      )
    );
    setCaja((p) => [
      ...p,
      {
        id: `MOV-${Date.now()}`,
        fecha: form.fecha,
        tipo: 'Ingreso',
        concepto: `Venta ${id} - ${prodSel.nombre}`,
        metodo: form.pago,
        monto: totalCalc,
      },
    ]);
    setModal(false);
    setForm({
      fecha: today(),
      vendedor: '',
      cliente: '',
      productoId: '',
      cantidad: 1,
      precioUnit: '',
      pago: '',
    });
  };

  const filtradas = ventas.filter((v) =>
    [v.producto, v.cliente, v.vendedor].some((s) =>
      s?.toLowerCase().includes(buscar.toLowerCase())
    )
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}
          >
            Registro de ventas
          </h2>
          <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
            {ventas.length} ventas registradas
          </p>
        </div>
        <Btn onClick={() => setModal(true)}>+ Nueva venta</Btn>
      </div>

      <input
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        placeholder="Buscar por producto, cliente o vendedor…"
        style={{
          width: '100%',
          border: `0.5px solid ${C.border}`,
          borderRadius: 8,
          padding: '9px 12px',
          fontSize: 13,
          marginBottom: 12,
          background: '#fafafa',
        }}
      />

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
          >
            <thead>
              <tr style={{ background: C.grayLight }}>
                {[
                  '# Venta',
                  'Fecha',
                  'Vendedor',
                  'Cliente',
                  'Producto',
                  'Cant.',
                  'Precio Unit.',
                  'Total',
                  'Margen',
                  'Pago',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: C.navy,
                      whiteSpace: 'nowrap',
                      borderBottom: `0.5px solid ${C.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((v, i) => (
                <tr
                  key={v.id}
                  style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                >
                  <td
                    style={{
                      padding: '9px 12px',
                      fontWeight: 600,
                      color: C.blue,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v.id}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      color: '#555',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v.fecha}
                  </td>
                  <td style={{ padding: '9px 12px', color: '#555' }}>
                    {v.vendedor.split(' ')[0]}
                  </td>
                  <td style={{ padding: '9px 12px', color: C.navy }}>
                    {v.cliente}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      color: C.navy,
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v.producto}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    {v.cantidad}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatBs(v.precioUnit)}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: C.navy,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatBs(v.total)}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      color: v.margen >= 0 ? C.green : C.red,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatBs(v.margen)}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <Badge
                      color={
                        v.pago === 'Efectivo'
                          ? 'green'
                          : v.pago === 'QR'
                          ? 'blue'
                          : 'purple'
                      }
                    >
                      {v.pago}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    style={{ padding: 24, textAlign: 'center', color: '#aaa' }}
                  >
                    No hay ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <Modal title="Registrar nueva venta" onClose={() => setModal(false)}>
          <Input
            label="Fecha"
            type="date"
            value={form.fecha}
            onChange={(v) => f('fecha', v)}
            required
          />
          <Select
            label="Vendedor"
            value={form.vendedor}
            onChange={(v) => f('vendedor', v)}
            options={['Willy (Admin)', 'Jilda (Vendedora)','Ricardo (Vendedor)','Jhaz (Vendedora)']}
            required
          />
          <Input
            label="Cliente"
            value={form.cliente}
            onChange={(v) => f('cliente', v)}
            placeholder="Nombre del cliente"
            required
          />
          <Select
            label="Producto"
            value={form.productoId}
            onChange={(v) => f('productoId', v)}
            options={productos
              .filter((p) => p.stock > 0)
              .map((p) => ({
                value: p.id,
                label: `${p.id} — ${p.nombre} (${p.stock} u.)`,
              }))}
            required
          />
          {prodSel && (
            <div
              style={{
                background: C.blueLight,
                borderRadius: 8,
                padding: 10,
                marginBottom: 12,
                fontSize: 12,
                color: C.blue,
              }}
            >
              Costo: {formatBs(prodSel.costo)} · Precio ref.:{' '}
              {formatBs(prodSel.precioRef)} · Stock disponible: {prodSel.stock}{' '}
              u.
            </div>
          )}
          <Input
            label="Cantidad"
            type="number"
            value={form.cantidad}
            onChange={(v) => f('cantidad', v)}
            required
          />
          <Input
            label="Precio negociado por unidad (Bs)"
            type="number"
            value={form.precioUnit}
            onChange={(v) => f('precioUnit', v)}
            required
          />
          {prodSel && form.precioUnit && (
            <div
              style={{
                background: margenCalc >= 0 ? C.greenLight : C.redLight,
                borderRadius: 8,
                padding: 10,
                marginBottom: 12,
                fontSize: 12,
                color: margenCalc >= 0 ? C.green : C.red,
              }}
            >
              Total: {formatBs(totalCalc)} · Margen por unidad:{' '}
              {formatBs(margenCalc)} (
              {((margenCalc / form.precioUnit) * 100).toFixed(1)}%)
              {margenCalc < 0 && ' ⚠ Estás vendiendo por debajo del costo'}
            </div>
          )}
          <Select
            label="Método de pago"
            value={form.pago}
            onChange={(v) => f('pago', v)}
            options={[
              'Efectivo',
              'QR / Billetera',
              'Transferencia',
              'USD Efectivo',
            ]}
            required
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Btn
              onClick={() => setModal(false)}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancelar
            </Btn>
            <Btn onClick={guardar} style={{ flex: 1 }}>
              Confirmar venta
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SECCIÓN: INVENTARIO ──────────────────────────────────────
function Inventario({ productos, setProductos }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [catFiltro, setCatFiltro] = useState('Todas');
  const [form, setForm] = useState({
    id: '',
    nombre: '',
    marca: '',
    categoria: '',
    stock: 0,
    stockMin: 3,
    costo: 0,
    precioRef: 0,
  });

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const abrir = (p = null) => {
    setEditando(p);
    setForm(
      p
        ? { ...p }
        : {
            id: '',
            nombre: '',
            marca: '',
            categoria: '',
            stock: 0,
            stockMin: 3,
            costo: 0,
            precioRef: 0,
          }
    );
    setModal(true);
  };

  const guardar = () => {
    if (!form.nombre || !form.categoria)
      return alert('Nombre y categoría son requeridos');
    if (editando) {
      setProductos((p) =>
        p.map((x) =>
          x.id === editando.id
            ? {
                ...form,
                costo: Number(form.costo),
                precioRef: Number(form.precioRef),
                stock: Number(form.stock),
                stockMin: Number(form.stockMin),
              }
            : x
        )
      );
    } else {
      const id =
        form.id || `PROD-${String(productos.length + 1).padStart(3, '0')}`;
      setProductos((p) => [
        ...p,
        {
          ...form,
          id,
          costo: Number(form.costo),
          precioRef: Number(form.precioRef),
          stock: Number(form.stock),
          stockMin: Number(form.stockMin),
        },
      ]);
    }
    setModal(false);
  };

  const filtrados = productos.filter((p) => {
    const q = buscar.toLowerCase();
    const matchQ = [p.nombre, p.marca, p.id].some((s) =>
      s?.toLowerCase().includes(q)
    );
    const matchCat = catFiltro === 'Todas' || p.categoria === catFiltro;
    return matchQ && matchCat;
  });

  const criticos = productos.filter((p) => p.stock <= p.stockMin).length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}
          >
            Inventario
          </h2>
          <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
            {productos.length} productos · {criticos} críticos
          </p>
        </div>
        <Btn onClick={() => abrir()}>+ Nuevo producto</Btn>
      </div>

      <div
        style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
      >
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar producto…"
          style={{
            flex: 1,
            minWidth: 160,
            border: `0.5px solid ${C.border}`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            background: '#fafafa',
          }}
        />
        {['Todas', 'Celular', 'Accesorio', 'Componente PC'].map((c) => (
          <button
            key={c}
            onClick={() => setCatFiltro(c)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `0.5px solid ${C.border}`,
              fontSize: 12,
              cursor: 'pointer',
              background: catFiltro === c ? C.navy : '#fff',
              color: catFiltro === c ? '#fff' : C.gray,
              fontWeight: catFiltro === c ? 600 : 400,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
          >
            <thead>
              <tr style={{ background: C.grayLight }}>
                {[
                  'SKU',
                  'Nombre',
                  'Marca',
                  'Categoría',
                  'Costo Bs',
                  'P. Ref. Bs',
                  'Mín.',
                  'Stock',
                  'Estado',
                  'Margen %',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: C.navy,
                      whiteSpace: 'nowrap',
                      borderBottom: `0.5px solid ${C.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => {
                const margen =
                  p.precioRef > 0
                    ? (((p.precioRef - p.costo) / p.precioRef) * 100).toFixed(1)
                    : 0;
                return (
                  <tr
                    key={p.id}
                    style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                  >
                    <td
                      style={{
                        padding: '9px 12px',
                        fontWeight: 600,
                        color: C.blue,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.id}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        color: C.navy,
                        maxWidth: 180,
                      }}
                    >
                      {p.nombre}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#555' }}>
                      {p.marca}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <Badge
                        color={
                          p.categoria === 'Celular'
                            ? 'blue'
                            : p.categoria === 'Accesorio'
                            ? 'green'
                            : 'purple'
                        }
                      >
                        {p.categoria}
                      </Badge>
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        color: C.amber,
                        fontWeight: 500,
                      }}
                    >
                      {formatBs(p.costo)}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                      }}
                    >
                      {formatBs(p.precioRef)}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'center',
                        color: '#888',
                      }}
                    >
                      {p.stockMin}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color:
                          p.stock === 0
                            ? C.red
                            : p.stock <= p.stockMin
                            ? C.amber
                            : C.navy,
                      }}
                    >
                      {p.stock}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <StockBadge stock={p.stock} min={p.stockMin} />
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        color: margen >= 25 ? C.green : C.red,
                        fontWeight: 500,
                      }}
                    >
                      {margen}%
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <button
                        onClick={() => abrir(p)}
                        style={{
                          background: C.blueLight,
                          color: C.blue,
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <Modal
          title={editando ? 'Editar producto' : 'Nuevo producto'}
          onClose={() => setModal(false)}
        >
          <Input
            label="SKU / Código"
            value={form.id}
            onChange={(v) => f('id', v)}
            placeholder="Ej: CEL-005"
          />
          <Input
            label="Nombre del producto"
            value={form.nombre}
            onChange={(v) => f('nombre', v)}
            required
          />
          <Input
            label="Marca"
            value={form.marca}
            onChange={(v) => f('marca', v)}
          />
          <Select
            label="Categoría"
            value={form.categoria}
            onChange={(v) => f('categoria', v)}
            options={['Celular', 'Accesorio', 'Componente PC']}
            required
          />
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
          >
            <Input
              label="Costo (Bs)"
              type="number"
              value={form.costo}
              onChange={(v) => f('costo', v)}
              required
            />
            <Input
              label="Precio referencia (Bs)"
              type="number"
              value={form.precioRef}
              onChange={(v) => f('precioRef', v)}
            />
            <Input
              label="Stock actual"
              type="number"
              value={form.stock}
              onChange={(v) => f('stock', v)}
              required
            />
            <Input
              label="Stock mínimo"
              type="number"
              value={form.stockMin}
              onChange={(v) => f('stockMin', v)}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Btn
              onClick={() => setModal(false)}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancelar
            </Btn>
            <Btn onClick={guardar} style={{ flex: 1 }}>
              {editando ? 'Guardar cambios' : 'Crear producto'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SECCIÓN: IMPORTACIÓN + PRORRATEO ─────────────────────────
function Importacion({ lotes, setLotes, productos, setProductos }) {
  const [tab, setTab] = useState('lotes');
  const [modal, setModal] = useState(false);
  const [loteSelId, setLoteSelId] = useState('');
  const [items, setItems] = useState([
    { productoId: '', unidades: 1, precioUSD: 0 },
  ]);
  const [form, setForm] = useState({
    fecha: today(),
    proveedor: '',
    descripcion: '',
    origenUSD: 0,
    tipoCambio: 6.97,
    flete: 0,
    seguro: 0,
    aranceles: 0,
    despachante: 0,
    otros: 0,
  });

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const costoTotal = (l) =>
    l.origenUSD * l.tipoCambio +
    Number(l.flete) +
    Number(l.seguro) +
    Number(l.aranceles) +
    Number(l.despachante) +
    Number(l.otros);

  const guardarLote = () => {
    if (!form.proveedor || !form.origenUSD)
      return alert('Completa los campos requeridos');
    const id = `LT-${String(lotes.length + 1).padStart(3, '0')}`;
    setLotes((p) => [
      ...p,
      {
        ...form,
        id,
        origenUSD: Number(form.origenUSD),
        tipoCambio: Number(form.tipoCambio),
        flete: Number(form.flete),
        seguro: Number(form.seguro),
        aranceles: Number(form.aranceles),
        despachante: Number(form.despachante),
        otros: Number(form.otros),
      },
    ]);
    setModal(false);
  };

  const loteSel = lotes.find((l) => l.id === loteSelId);
  const costoLote = loteSel ? costoTotal(loteSel) : 0;
  const valorTotalItems = items.reduce(
    (a, it) =>
      a +
      Number(it.precioUSD) *
        Number(it.unidades) *
        (loteSel?.tipoCambio || 6.97),
    0
  );

  const aplicarProrrateo = () => {
    if (!loteSel) return alert('Selecciona un lote');
    items.forEach((it) => {
      if (!it.productoId || !it.unidades || !it.precioUSD) return;
      const valorItem =
        Number(it.precioUSD) * Number(it.unidades) * loteSel.tipoCambio;
      const proporcion = valorTotalItems > 0 ? valorItem / valorTotalItems : 0;
      const costosExtra = (costoLote - valorTotalItems) * proporcion;
      const costoUnitReal = Math.round(
        valorItem / Number(it.unidades) + costosExtra / Number(it.unidades)
      );
      setProductos((p) =>
        p.map((x) =>
          x.id === it.productoId
            ? {
                ...x,
                stock: x.stock + Number(it.unidades),
                costo: costoUnitReal,
              }
            : x
        )
      );
    });
    alert(
      'Prorrateo aplicado. El inventario fue actualizado con el costo real de cada producto.'
    );
    setItems([{ productoId: '', unidades: 1, precioUSD: 0 }]);
    setLoteSelId('');
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}
          >
            Importación y prorrateo
          </h2>
          <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
            {lotes.length} lotes registrados
          </p>
        </div>
        {tab === 'lotes' && (
          <Btn onClick={() => setModal(true)}>+ Nuevo lote</Btn>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 16,
          background: C.grayLight,
          borderRadius: 10,
          padding: 4,
          width: 'fit-content',
        }}
      >
        {[
          ['lotes', 'Lotes importados'],
          ['prorrateo', 'Calcular prorrateo'],
        ].map(([k, v]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12,
              fontWeight: tab === k ? 600 : 400,
              background: tab === k ? '#fff' : 'transparent',
              color: tab === k ? C.navy : '#777',
              cursor: 'pointer',
              boxShadow: tab === k ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {tab === 'lotes' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {lotes.map((l) => {
            const ct = costoTotal(l);
            return (
              <Card key={l.id}>
                <div style={{ padding: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.amber,
                        }}
                      >
                        {l.id}
                      </span>
                      <span
                        style={{ fontSize: 12, color: '#888', marginLeft: 8 }}
                      >
                        {l.fecha}
                      </span>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: C.navy,
                          marginTop: 2,
                        }}
                      >
                        {l.proveedor}
                      </div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {l.descripcion}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        Costo total del lote
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: C.amber,
                        }}
                      >
                        {formatBs(ct)}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(100px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {[
                      ['Origen USD', `$${l.origenUSD}`],
                      ['T.C.', l.tipoCambio],
                      ['Origen Bs', formatBs(l.origenUSD * l.tipoCambio)],
                      ['Flete', formatBs(l.flete)],
                      ['Aranceles', formatBs(l.aranceles)],
                      ['Despachante', formatBs(l.despachante)],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          background: C.amberLight,
                          borderRadius: 8,
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ fontSize: 10, color: C.amber }}>{k}</div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.amberMid,
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
          {lotes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
              No hay lotes registrados
            </div>
          )}
        </div>
      )}

      {tab === 'prorrateo' && (
        <Card>
          <CardHead title="Calcular costo unitario real por prorrateo" />
          <div style={{ padding: 16 }}>
            <Select
              label="Seleccionar lote importado"
              value={loteSelId}
              onChange={setLoteSelId}
              options={lotes.map((l) => ({
                value: l.id,
                label: `${l.id} — ${l.proveedor} (${formatBs(costoTotal(l))})`,
              }))}
            />

            {loteSel && (
              <div
                style={{
                  background: C.amberLight,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 16,
                  fontSize: 12,
                  color: C.amber,
                }}
              >
                Costo total del lote: <strong>{formatBs(costoLote)}</strong> ·
                Tipo de cambio: {loteSel.tipoCambio} Bs/$
              </div>
            )}

            <div
              style={{
                marginBottom: 8,
                fontSize: 12,
                fontWeight: 600,
                color: C.navy,
              }}
            >
              Productos del lote
            </div>
            {items.map((it, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr auto',
                  gap: 8,
                  marginBottom: 8,
                  alignItems: 'end',
                }}
              >
                <Select
                  label={i === 0 ? 'Producto (SKU)' : ''}
                  value={it.productoId}
                  onChange={(v) =>
                    setItems((p) =>
                      p.map((x, j) => (j === i ? { ...x, productoId: v } : x))
                    )
                  }
                  options={productos.map((p) => ({
                    value: p.id,
                    label: `${p.id} — ${p.nombre}`,
                  }))}
                />
                <Input
                  label={i === 0 ? 'Unidades' : ''}
                  type="number"
                  value={it.unidades}
                  onChange={(v) =>
                    setItems((p) =>
                      p.map((x, j) => (j === i ? { ...x, unidades: v } : x))
                    )
                  }
                />
                <Input
                  label={i === 0 ? 'Precio USD/u.' : ''}
                  type="number"
                  value={it.precioUSD}
                  onChange={(v) =>
                    setItems((p) =>
                      p.map((x, j) => (j === i ? { ...x, precioUSD: v } : x))
                    )
                  }
                />
                <button
                  onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                  style={{
                    background: C.redLight,
                    color: C.red,
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 10px',
                    cursor: 'pointer',
                    marginBottom: 12,
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            <button
              onClick={() =>
                setItems((p) => [
                  ...p,
                  { productoId: '', unidades: 1, precioUSD: 0 },
                ])
              }
              style={{
                background: C.blueLight,
                color: C.blue,
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              + Agregar producto
            </button>

            {loteSel &&
              items.some((it) => it.productoId && it.precioUSD > 0) && (
                <div
                  style={{
                    background: C.greenLight,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  {items
                    .filter((it) => it.productoId && it.precioUSD > 0)
                    .map((it, i) => {
                      const prod = productos.find(
                        (p) => p.id === it.productoId
                      );
                      const valItem =
                        Number(it.precioUSD) *
                        Number(it.unidades) *
                        loteSel.tipoCambio;
                      const prop =
                        valorTotalItems > 0 ? valItem / valorTotalItems : 0;
                      const extra = (costoLote - valorTotalItems) * prop;
                      const unitReal = Math.round(
                        valItem / Number(it.unidades) +
                          extra / Number(it.unidades)
                      );
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 12,
                            color: C.green,
                            marginBottom: 4,
                          }}
                        >
                          <span>{prod?.nombre || it.productoId}</span>
                          <span style={{ fontWeight: 700 }}>
                            Costo real: {formatBs(unitReal)}/u.
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

            <Btn onClick={aplicarProrrateo} style={{ width: '100%' }}>
              Aplicar prorrateo al inventario
            </Btn>
          </div>
        </Card>
      )}

      {modal && (
        <Modal
          title="Registrar lote de importación"
          onClose={() => setModal(false)}
        >
          <Input
            label="Fecha de llegada"
            type="date"
            value={form.fecha}
            onChange={(v) => f('fecha', v)}
            required
          />
          <Input
            label="Proveedor / Origen"
            value={form.proveedor}
            onChange={(v) => f('proveedor', v)}
            required
          />
          <Input
            label="Descripción del lote"
            value={form.descripcion}
            onChange={(v) => f('descripcion', v)}
          />
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
          >
            <Input
              label="Precio origen (USD)"
              type="number"
              value={form.origenUSD}
              onChange={(v) => f('origenUSD', v)}
              required
            />
            <Input
              label="Tipo de cambio (Bs/$)"
              type="number"
              value={form.tipoCambio}
              onChange={(v) => f('tipoCambio', v)}
              required
            />
            <Input
              label="Flete internacional (Bs)"
              type="number"
              value={form.flete}
              onChange={(v) => f('flete', v)}
            />
            <Input
              label="Seguro (Bs)"
              type="number"
              value={form.seguro}
              onChange={(v) => f('seguro', v)}
            />
            <Input
              label="Aranceles / Aduana (Bs)"
              type="number"
              value={form.aranceles}
              onChange={(v) => f('aranceles', v)}
            />
            <Input
              label="Despachante (Bs)"
              type="number"
              value={form.despachante}
              onChange={(v) => f('despachante', v)}
            />
            <Input
              label="Otros gastos (Bs)"
              type="number"
              value={form.otros}
              onChange={(v) => f('otros', v)}
            />
          </div>
          <div
            style={{
              background: C.amberLight,
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              fontSize: 13,
              color: C.amber,
            }}
          >
            Costo total estimado: <strong>{formatBs(costoTotal(form))}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              onClick={() => setModal(false)}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancelar
            </Btn>
            <Btn onClick={guardarLote} style={{ flex: 1 }}>
              Guardar lote
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SECCIÓN: FLUJO DE CAJA ───────────────────────────────────
function FlujoCaja({ caja, setCaja }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    fecha: today(),
    tipo: 'Ingreso',
    concepto: '',
    metodo: 'Efectivo',
    monto: '',
  });
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const guardar = () => {
    if (!form.concepto || !form.monto)
      return alert('Completa todos los campos');
    const id = `MOV-${Date.now()}`;
    setCaja((p) => [...p, { ...form, id, monto: Number(form.monto) }]);
    setModal(false);
    setForm({
      fecha: today(),
      tipo: 'Ingreso',
      concepto: '',
      metodo: 'Efectivo',
      monto: '',
    });
  };

  const saldo = caja.reduce(
    (a, m) => (m.tipo === 'Ingreso' ? a + m.monto : a - m.monto),
    0
  );
  const ingresos = caja
    .filter((m) => m.tipo === 'Ingreso')
    .reduce((a, m) => a + m.monto, 0);
  const egresos = caja
    .filter((m) => m.tipo === 'Egreso')
    .reduce((a, m) => a + m.monto, 0);

  const porMetodo = ['Efectivo', 'QR / Billetera', 'Transferencia'].map(
    (met) => ({
      metodo: met,
      saldo: caja
        .filter((m) => m.metodo === met)
        .reduce(
          (a, m) => (m.tipo === 'Ingreso' ? a + m.monto : a - m.monto),
          0
        ),
    })
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}
          >
            Flujo de caja
          </h2>
          <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
            {caja.length} movimientos registrados
          </p>
        </div>
        <Btn onClick={() => setModal(true)}>+ Registrar movimiento</Btn>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <KpiCard
          label="Saldo total"
          value={formatBs(saldo)}
          sub={saldo >= 0 ? 'Positivo' : 'Negativo'}
          subColor={saldo >= 0 ? C.green : C.red}
        />
        <KpiCard
          label="Total ingresos"
          value={formatBs(ingresos)}
          subColor={C.green}
          sub="↑ Entradas"
        />
        <KpiCard
          label="Total egresos"
          value={formatBs(egresos)}
          subColor={C.red}
          sub="↓ Salidas"
        />
        {porMetodo.map((m) => (
          <KpiCard key={m.metodo} label={m.metodo} value={formatBs(m.saldo)} />
        ))}
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
          >
            <thead>
              <tr style={{ background: C.grayLight }}>
                {['#', 'Fecha', 'Tipo', 'Concepto', 'Método', 'Monto (Bs)'].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: C.navy,
                        borderBottom: `0.5px solid ${C.border}`,
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {[...caja].reverse().map((m, i) => (
                <tr
                  key={m.id}
                  style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                >
                  <td
                    style={{ padding: '9px 12px', color: '#aaa', fontSize: 10 }}
                  >
                    {m.id}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      color: '#555',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.fecha}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <Badge color={m.tipo === 'Ingreso' ? 'green' : 'red'}>
                      {m.tipo}
                    </Badge>
                  </td>
                  <td style={{ padding: '9px 12px', color: C.navy }}>
                    {m.concepto}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <Badge color="gray">{m.metodo}</Badge>
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: m.tipo === 'Ingreso' ? C.green : C.red,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.tipo === 'Ingreso' ? '+' : '−'} {formatBs(m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <Modal
          title="Registrar movimiento de caja"
          onClose={() => setModal(false)}
        >
          <Input
            label="Fecha"
            type="date"
            value={form.fecha}
            onChange={(v) => f('fecha', v)}
            required
          />
          <Select
            label="Tipo"
            value={form.tipo}
            onChange={(v) => f('tipo', v)}
            options={['Ingreso', 'Egreso']}
            required
          />
          <Input
            label="Concepto / Descripción"
            value={form.concepto}
            onChange={(v) => f('concepto', v)}
            placeholder="Ej: Pago alquiler, Servicio luz…"
            required
          />
          <Select
            label="Método"
            value={form.metodo}
            onChange={(v) => f('metodo', v)}
            options={[
              'Efectivo',
              'QR / Billetera',
              'Transferencia',
              'USD Efectivo',
            ]}
            required
          />
          <Input
            label="Monto (Bs)"
            type="number"
            value={form.monto}
            onChange={(v) => f('monto', v)}
            required
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              onClick={() => setModal(false)}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancelar
            </Btn>
            <Btn onClick={guardar} style={{ flex: 1 }}>
              Registrar
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SECCIÓN: REPORTES ────────────────────────────────────────
function Reportes({ ventas, productos, caja }) {
  const ventasMes = ventas.filter((v) => v.fecha?.startsWith(curMonth));
  const totalMes = ventasMes.reduce((a, v) => a + v.total, 0);
  const costoMes = ventasMes.reduce((a, v) => a + v.costo * v.cantidad, 0);
  const margenMes = totalMes > 0 ? (totalMes - costoMes) / totalMes : 0;
  const costoNac = caja
    .filter((m) => m.tipo === 'Egreso' && !m.concepto.includes('Lote'))
    .reduce((a, m) => a + m.monto, 0);
  const resultadoOp = totalMes - costoMes - costoNac;

  const vendedores = ['Carlos (Admin)', 'María (Vendedora)'].map((vend) => {
    const vs = ventasMes.filter((v) => v.vendedor === vend);
    return {
      vendedor: vend.split(' ')[0],
      ventas: vs.length,
      total: vs.reduce((a, v) => a + v.total, 0),
      margen: vs.reduce((a, v) => a + v.margen * v.cantidad, 0),
    };
  });

  const topProds = Object.values(
    ventasMes.reduce((acc, v) => {
      if (!acc[v.productoId])
        acc[v.productoId] = {
          nombre:
            v.producto.length > 20 ? v.producto.slice(0, 20) + '…' : v.producto,
          total: 0,
          unidades: 0,
          margen: 0,
        };
      acc[v.productoId].total += v.total;
      acc[v.productoId].unidades += v.cantidad;
      acc[v.productoId].margen += v.margen * v.cantidad;
      return acc;
    }, {})
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const catData = ['Celular', 'Accesorio', 'Componente PC'].map((cat) => {
    const vs = ventasMes.filter((v) => v.categoria === cat);
    const tot = vs.reduce((a, v) => a + v.total, 0);
    const costo = vs.reduce((a, v) => a + v.costo * v.cantidad, 0);
    return {
      cat: cat === 'Componente PC' ? 'Comp. PC' : cat,
      total: tot,
      margen: tot > 0 ? (((tot - costo) / tot) * 100).toFixed(1) : 0,
    };
  });

  const COLORS = [C.blue, C.greenMid, C.purple];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>
          Reportes de gestión
        </h2>
        <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
          Mes actual · Datos calculados automáticamente
        </p>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <CardHead
          title="Estado de resultados — mes actual"
          badge="P&G"
          badgeColor="blue"
        />
        <div style={{ padding: 16 }}>
          {[
            ['Ingresos por ventas', totalMes, C.green, false],
            ['(−) Costo de ventas', costoMes, C.red, false],
            ['= Margen bruto', totalMes - costoMes, C.blue, true],
            ['% Margen bruto', null, null, false, formatPct(margenMes)],
            ['(−) Costos operativos', costoNac, C.amber, false],
            [
              '= Resultado operativo',
              resultadoOp,
              resultadoOp >= 0 ? C.green : C.red,
              true,
            ],
          ].map(([label, val, color, bold, custom]) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 0',
                borderBottom: `0.5px solid ${C.border}`,
                background: bold ? C.grayLight : 'transparent',
                paddingLeft: bold ? 8 : 0,
                paddingRight: bold ? 8 : 0,
                borderRadius: bold ? 6 : 0,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: bold ? 600 : 400,
                  color: bold ? C.navy : '#555',
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: bold ? 700 : 500,
                  color: color || '#555',
                }}
              >
                {custom || formatBs(val)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Card>
          <CardHead
            title="Top productos del mes"
            badge="Por ingresos"
            badgeColor="green"
          />
          <div style={{ padding: '8px 0' }}>
            {topProds.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: '7px 14px',
                  borderBottom: `0.5px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 50,
                    background: C.blueLight,
                    color: C.blue,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.navy,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.nombre}
                  </div>
                  <div style={{ fontSize: 10, color: '#888' }}>
                    {p.unidades} u. · Margen: {formatBs(p.margen)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.navy,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatBs(p.total)}
                </span>
              </div>
            ))}
            {topProds.length === 0 && (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: '#aaa',
                  fontSize: 12,
                }}
              >
                Sin ventas este mes
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="Rendimiento por vendedor" />
          <div style={{ padding: 16 }}>
            {vendedores.map((v) => (
              <div key={v.vendedor} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: C.navy }}
                  >
                    {v.vendedor}
                  </span>
                  <span
                    style={{ fontSize: 13, fontWeight: 700, color: C.green }}
                  >
                    {formatBs(v.total)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                  {v.ventas} ventas · Margen: {formatBs(v.margen)}
                </div>
                <div
                  style={{
                    height: 6,
                    background: C.grayLight,
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width:
                        totalMes > 0
                          ? `${((v.total / totalMes) * 100).toFixed(0)}%`
                          : '0%',
                      background: C.blue,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                  {totalMes > 0 ? ((v.total / totalMes) * 100).toFixed(1) : 0}%
                  del total
                </div>
              </div>
            ))}
          </div>
          <CardHead title="Distribución por categoría" />
          <div style={{ padding: '12px 4px' }}>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={catData.filter((c) => c.total > 0)}
                  dataKey="total"
                  nameKey="cat"
                  cx="50%"
                  cy="50%"
                  outerRadius={55}
                  label={({ cat, percent }) =>
                    `${cat} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  fontSize={10}
                >
                  {catData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatBs(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── SIDEBAR / NAV ───────────────────────────────────────────
const NAVS = [
  { id: 'dashboard', label: 'Dashboard', color: C.navy },
  { id: 'ventas', label: 'Ventas', color: C.greenMid },
  { id: 'inventario', label: 'Inventario', color: C.blue },
  { id: 'importacion', label: 'Importación', color: C.amberMid },
  { id: 'caja', label: 'Flujo de caja', color: C.purple },
  { id: 'reportes', label: 'Reportes', color: C.navy },
];

// ─── APP ROOT ─────────────────────────────────────────────────
export default function App() {
  const [productos, setProductos, loadingP] = useSupabaseTable(
    'productos',
    INIT_PRODUCTOS
  );
  const [ventas, setVentas, loadingV] = useSupabaseTable('ventas', INIT_VENTAS);
  const [caja, setCaja, loadingC] = useSupabaseTable('caja', INIT_CAJA);
  const [lotes, setLotes, loadingL] = useSupabaseTable('lotes', INIT_LOTES);

  const [seccion, setSeccion] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const criticos = productos.filter((p) => p.stock <= p.stockMin).length;

  const NavItem = ({ item }) => {
    const active = seccion === item.id;
    return (
      <div
        onClick={() => {
          setSeccion(item.id);
          setSidebarOpen(false);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          borderRadius: 8,
          margin: '1px 6px',
          cursor: 'pointer',
          background: active ? C.blueLight : 'transparent',
          color: active ? C.blue : '#555',
          fontWeight: active ? 600 : 400,
          fontSize: 13,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: active ? C.blue : item.color,
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.id === 'inventario' && criticos > 0 && (
          <Badge color="red">{criticos}</Badge>
        )}
      </div>
    );
  };

  const Sidebar = ({ style }) => (
    <div
      style={{
        width: 210,
        background: '#fff',
        borderRight: `0.5px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          padding: '16px 14px',
          borderBottom: `0.5px solid ${C.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: C.navy,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            MI
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
              MEDIMPOR
            </div>
            <div style={{ fontSize: 10, color: '#aaa' }}>Gestión Integral</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 0', flex: 1, overflowY: 'auto' }}>
        <div
          style={{
            fontSize: 10,
            color: '#bbb',
            padding: '0 18px 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}
        >
          Módulos
        </div>
        {NAVS.map((n) => (
          <NavItem key={n.id} item={n} />
        ))}
      </div>
      <div
        style={{
          padding: '10px 14px',
          borderTop: `0.5px solid ${C.border}`,
          fontSize: 11,
          color: '#bbb',
        }}
      >
        v1.0 · Datos en la nube
      </div>
    </div>
  );

  const renderSeccion = () => {
    if (loadingP || loadingV || loadingC || loadingL)
      return (
        <div style={{ padding: 40, textAlign: 'center', fontSize: 20 }}>
          Cargando datos de la nube...
        </div>
      );
    switch (seccion) {
      case 'dashboard':
        return <Dashboard productos={productos} ventas={ventas} caja={caja} />;
      case 'ventas':
        return (
          <Ventas
            productos={productos}
            ventas={ventas}
            setVentas={setVentas}
            setProductos={setProductos}
            setCaja={setCaja}
          />
        );
      case 'inventario':
        return <Inventario productos={productos} setProductos={setProductos} />;
      case 'importacion':
        return (
          <Importacion
            lotes={lotes}
            setLotes={setLotes}
            productos={productos}
            setProductos={setProductos}
          />
        );
      case 'caja':
        return <FlujoCaja caja={caja} setCaja={setCaja} />;
      case 'reportes':
        return <Reportes ventas={ventas} productos={productos} caja={caja} />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#f5f4f0',
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>
      <Sidebar style={{ display: 'flex' }} />

      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex' }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
            }}
            onClick={() => setSidebarOpen(false)}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Sidebar style={{ height: '100vh' }} />
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '0 16px',
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
            borderBottom: `0.5px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: C.navy,
              padding: 4,
            }}
          >
            ☰
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
            MEDIMPOR
          </span>
          <div style={{ width: 28 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {renderSeccion()}
        </div>

        <div
          style={{
            display: 'flex',
            background: '#fff',
            borderTop: `0.5px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          {NAVS.slice(0, 5).map((n) => (
            <button
              key={n.id}
              onClick={() => setSeccion(n.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 9,
                color: seccion === n.id ? C.blue : '#aaa',
                fontWeight: seccion === n.id ? 700 : 400,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: seccion === n.id ? C.blueLight : C.grayLight,
                  marginBottom: 1,
                }}
              />
              {n.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
