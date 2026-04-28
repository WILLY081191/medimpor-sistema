import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

//  COLORES Y ESTILOS
const C = {
  navy: '#0D2E4F', blue: '#185FA5', green: '#27500A', amber: '#633806',
  red: '#791F1F', gray: '#444441', white: '#FFFFFF', border: 'rgba(0,0,0,0.1)',
  bg: '#F5F7FA',
};

// 🧩 COMPONENTES UI BÁSICOS
const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: `1px solid ${C.border}`, ...style }}>{children}</div>
);
const Btn = ({ children, onClick, variant = 'primary', style }) => (
  <button onClick={onClick} style={{
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
    background: variant === 'danger' ? C.red : variant === 'success' ? C.green : variant === 'secondary' ? '#e2e8f0' : C.navy,
    color: variant === 'secondary' ? C.gray : '#fff', ...style
  }}>{children}</button>
);
const Input = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{label}</label>}
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '10px', borderRadius: 6, border: `1px solid ${C.border}`, boxSizing: 'border-box' }} />
  </div>
);

//  MÓDULO 1: DASHBOARD
function ModuloDashboard({ cuentas, movimientos }) {
  const totalGeneral = cuentas.reduce((acc, c) => acc + Number(c.saldo_actual || 0), 0);
  const enBanco = cuentas.filter(c => c.tipo === 'banco').reduce((acc, c) => acc + Number(c.saldo_actual || 0), 0);
  const enCaja = cuentas.filter(c => c.tipo === 'efectivo').reduce((acc, c) => acc + Number(c.saldo_actual || 0), 0);

  return (
    <div>
      <h2 style={{ color: C.navy, marginBottom: 20 }}> Dashboard General</h2>
      
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Card style={{ borderLeft: `4px solid ${C.blue}` }}>
          <div style={{ fontSize: 12, color: '#888' }}>PATRIMONIO TOTAL</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.navy }}>Bs {totalGeneral.toLocaleString()}</div>
        </Card>
        <Card style={{ borderLeft: `4px solid ${C.green}` }}>
          <div style={{ fontSize: 12, color: '#888' }}>💵 EFECTIVO EN MANO</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.green }}>Bs {enCaja.toLocaleString()}</div>
        </Card>
        <Card style={{ borderLeft: `4px solid ${C.amber}` }}>
          <div style={{ fontSize: 12, color: '#888' }}>🏦 EN BANCOS / QR</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.amber }}>Bs {enBanco.toLocaleString()}</div>
        </Card>
      </div>

      {/* Actividad Reciente */}
      <Card>
        <h3 style={{ marginTop: 0, color: C.gray }}> Últimos Movimientos</h3>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {movimientos.map(m => (
            <div key={m.id} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.tipo === 'aporte' ? '💰 Aporte' : m.tipo === 'transferencia' ? '🔄 Transferencia' : '💸 Gasto'}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{m.concepto}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: C.navy }}>Bs {Number(m.monto).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{new Date(m.fecha).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
          {movimientos.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#aaa' }}>No hay actividad registrada</div>}
        </div>
      </Card>
    </div>
  );
}

// 💰 MÓDULO 2: CAJA Y CAPITAL
function ModuloCaja({ cuentas, setCuentas }) {
  const [movimientos, setMovimientos] = useState([]);
  const [accion, setAccion] = useState('aporte'); 
  const [monto, setMonto] = useState('');
  const [cuentaOrigen, setCuentaOrigen] = useState('');
  const [cuentaDestino, setCuentaDestino] = useState('');
  const [concepto, setConcepto] = useState('');

  const ejecutarTransaccion = async () => {
    if (!monto || Number(monto) <= 0) return alert('Ingresa un monto válido');

    const nuevoMovimiento = {
      tipo: accion,
      monto: Number(monto),
      moneda: 'Bs',
      concepto: concepto || (accion === 'aporte' ? 'Aporte de capital' : accion),
      fecha: new Date().toISOString()
    };

    if (accion === 'transferencia') {
      if (!cuentaOrigen || !cuentaDestino) return alert('Selecciona cuentas de origen y destino');
      if (cuentaOrigen === cuentaDestino) return alert('Las cuentas deben ser diferentes');
      nuevoMovimiento.cuenta_origen_id = cuentaOrigen;
      nuevoMovimiento.cuenta_destino_id = cuentaDestino;
    } else if (accion === 'aporte') {
      if (!cuentaDestino) return alert('Selecciona la cuenta de destino');
      nuevoMovimiento.cuenta_destino_id = cuentaDestino;
    } else {
      if (!cuentaOrigen) return alert('Selecciona la cuenta de origen');
      nuevoMovimiento.cuenta_origen_id = cuentaOrigen;
    }

    const { error } = await supabase.from('caja_movimientos').insert([nuevoMovimiento]);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('✅ Transacción registrada con éxito');
      setMonto(''); setConcepto('');
      window.location.reload(); 
    }
  };

  return (
    <div>
      <h2 style={{ color: C.navy }}> Caja y Capital</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <h3 style={{ marginTop: 0, color: C.blue }}>Registrar Movimiento</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Btn variant={accion === 'aporte' ? 'primary' : 'secondary'} onClick={() => setAccion('aporte')}>Aporte</Btn>
            <Btn variant={accion === 'transferencia' ? 'primary' : 'secondary'} onClick={() => setAccion('transferencia')}>Transferencia</Btn>
            <Btn variant={accion === 'gasto' ? 'primary' : 'secondary'} onClick={() => setAccion('gasto')}>Gasto</Btn>
          </div>

          <Input label="Monto (Bs)" value={monto} onChange={setMonto} type="number" placeholder="0.00" />
          
          {accion !== 'gasto' && (
            <select value={cuentaDestino} onChange={(e) => setCuentaDestino(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <option value="">Seleccionar Cuenta Destino</option>
              {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}

          {(accion === 'transferencia' || accion === 'gasto') && (
            <select value={cuentaOrigen} onChange={(e) => setCuentaOrigen(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <option value="">Seleccionar Cuenta Origen</option>
              {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}

          <Input label="Concepto / Nota" value={concepto} onChange={setConcepto} placeholder="Ej: Inversión inicial, Depósito..." />
          <Btn onClick={ejecutarTransaccion} style={{ width: '100%', marginTop: 8 }}>✅ Confirmar</Btn>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>📜 Historial Completo</h3>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {movimientos.map(m => (
              <div key={m.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{m.tipo === 'aporte' ? '💰 Aporte' : m.tipo === 'transferencia' ? '🔄 Transferencia' : '💸 Gasto'}</div>
                <div style={{ color: '#888' }}>{m.concepto}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: m.cuenta_destino_id ? C.green : C.red }}>
                    {m.cuenta_destino_id ? '+' : '-'} Bs {Number(m.monto).toLocaleString()}
                  </span>
                  <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(m.fecha).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
             {movimientos.length === 0 && <div style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>Sin movimientos aún</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

//  APP PRINCIPAL
export default function App() {
  const [seccion, setSeccion] = useState('dashboard');
  const [cuentas, setCuentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      // Cargar Cuentas
      const { data: cuentasData } = await supabase.from('cuentas').select('*').order('id');
      if (cuentasData) setCuentas(cuentasData);

      // Cargar Movimientos
      const { data: movData } = await supabase.from('caja_movimientos').select('*').order('fecha', { ascending: false }).limit(20);
      if (movData) setMovimientos(movData);

      setLoading(false);
    };
    cargarDatos();
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando sistema...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: C.bg }}>
      {/* Sidebar */}
      <div style={{ width: 250, background: '#fff', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 24, borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ margin: 0, color: C.navy }}>MEDIMPOR</h2>
          <span style={{ fontSize: 12, color: '#888' }}>Sistema de Gestión Integral</span>
        </div>
        <div style={{ padding: '20px 12px', flex: 1 }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'caja', label: '💰 Caja & Capital' },
            { id: 'ventas', label: '🛒 Ventas' },
            { id: 'importaciones', label: '📦 Importaciones' },
            { id: 'inventario', label: '📋 Inventario' },
            { id: 'reportes', label: '📈 Reportes' },
          ].map(item => (
            <div key={item.id} onClick={() => setSeccion(item.id)} style={{
              padding: '12px 16px', marginBottom: 4, borderRadius: 8, cursor: 'pointer',
              background: seccion === item.id ? C.bg : 'transparent',
              color: seccion === item.id ? C.navy : '#666', fontWeight: seccion === item.id ? 700 : 400
            }}>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Contenido Principal */}
      <div style={{ flex: 1, padding: 30, overflowY: 'auto' }}>
        {seccion === 'dashboard' && <ModuloDashboard cuentas={cuentas} movimientos={movimientos} />}
        {seccion === 'caja' && <ModuloCaja cuentas={cuentas} setCuentas={setCuentas} />}
        {seccion !== 'dashboard' && seccion !== 'caja' && (
          <Card style={{ textAlign: 'center', padding: 50 }}>
            <h2 style={{ color: C.gray }}>🚧 Módulo en construcción</h2>
            <p style={{ color: '#888' }}>Este módulo estará disponible en el siguiente paso.</p>
          </Card>
        )}
      </div>
    </div>
  );
}