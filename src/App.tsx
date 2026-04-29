import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const C = {
  navy: '#0D2E4F', blue: '#185FA5', green: '#27500A', amber: '#633806',
  red: '#791F1F', gray: '#444441', bg: '#F5F7FA', border: 'rgba(0,0,0,0.1)'
};

const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: `1px solid ${C.border}`, ...style }}>{children}</div>
);

const Btn = ({ children, onClick, variant = 'primary', style, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600, opacity: disabled ? 0.5 : 1,
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

// 📊 DASHBOARD
function Dashboard({ cuentas, movimientos }) {
  const totalPatrimonio = cuentas.reduce((acc, c) => acc + Number(c.saldo_actual || 0), 0);
  return (
    <div>
      <h2 style={{ color: C.navy }}>📊 Dashboard</h2>
      <Card style={{ marginTop: 20 }}>
        <h3>Patrimonio Total</h3>
        <p style={{ fontSize: 30, fontWeight: 'bold', color: C.navy }}>Bs {totalPatrimonio.toLocaleString()}</p>
      </Card>
      <h3 style={{ marginTop: 30 }}>Últimos Movimientos</h3>
      {movimientos.map(m => (
        <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
          <b>{m.tipo}</b>: {m.concepto} - <span style={{ color: C.green }}>+Bs {m.monto}</span>
        </div>
      ))}
    </div>
  );
}

// 💰 CAJA
function Caja({ cuentas }) {
  const [movimientos, setMovimientos] = useState([]);
  const [monto, setMonto] = useState('');
  const [cuentaDestino, setCuentaDestino] = useState('');
  const [concepto, setConcepto] = useState('');

  useEffect(() => {
    supabase.from('caja_movimientos').select('*').order('fecha', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setMovimientos(data); });
  }, []);

  const guardar = async () => {
    if (!monto || !cuentaDestino) return alert('Completa monto y cuenta');
    await supabase.from('caja_movimientos').insert([{
      tipo: 'aporte', monto: Number(monto), concepto, cuenta_destino_id: cuentaDestino, fecha: new Date().toISOString()
    }]);
    alert('Guardado'); window.location.reload();
  };

  return (
    <div>
      <h2 style={{ color: C.navy }}>💰 Caja y Capital</h2>
      <Card>
        <Input label="Monto (Bs)" value={monto} onChange={setMonto} type="number" />
        <label style={{ fontSize: 12, color: '#666' }}>Cuenta Destino</label>
        <select value={cuentaDestino} onChange={(e) => setCuentaDestino(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: 12, borderRadius: 6, border: `1px solid ${C.border}` }}>
          <option value="">Seleccionar...</option>
          {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <Input label="Concepto" value={concepto} onChange={setConcepto} />
        <Btn onClick={guardar} style={{ width: '100%' }}>Registrar Aporte</Btn>
      </Card>
      <div style={{ marginTop: 20 }}>
        <h3>Historial</h3>
        {movimientos.map(m => (
          <div key={m.id} style={{ padding: '8px', background: '#f9f9f9', marginBottom: 5, borderRadius: 4 }}>
            {m.tipo}: {m.concepto} ({m.monto})
          </div>
        ))}
      </div>
    </div>
  );
}

// 🛒 VENTAS (CON DIAGNÓSTICO)
function Ventas({ cuentas }) {
  const [productos, setProductos] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [vendedorId, setVendedorId] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      console.log("🔍 Buscando productos...");
      const {  p, error: errP } = await supabase.from('productos').select('*');
      if (errP) {
        console.error("❌ ERROR:", errP);
        alert("Error: " + errP.message);
      } else {
        console.log("✅ PRODUCTOS:", p);
        setProductos(p || []);
      }
      const {  v } = await supabase.from('vendedores').select('*');
      if (v) setVendedores(v);
      setLoading(false);
    };
    cargar();
  }, []);

  const agregar = (prod) => {
    const item = carrito.find(i => i.producto_id === prod.id);
    if (item) {
      setCarrito(carrito.map(i => i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      setCarrito([...carrito, { producto_id: prod.id, nombre: prod.nombre, precio: prod.precio_venta_bs, cantidad: 1 }]);
    }
  };

  const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  if (loading) return <div style={{padding:20}}>⏳ Cargando...</div>;

  return (
    <div>
      <h2 style={{ color: C.navy }}>🛒 Punto de Venta</h2>
      
      {productos.length === 0 ? (
        <Card style={{background: '#ffebee', color: 'red', padding: 20}}>
          ⚠️ <b>No hay productos disponibles</b><br/>
          Revisa Supabase → tabla productos<br/>
          Consola: F12 → ver errores
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card>
            <h3>Productos ({productos.length})</h3>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {productos.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{p.nombre}</div>
                    <small>Stock: {p.stock_actual} | Precio: {p.precio_venta_bs} Bs</small>
                  </div>
                  <Btn onClick={() => agregar(p)} disabled={p.stock_actual === 0}>+ Agregar</Btn>
                </div>
              ))}
            </div>
          </Card>

          <div>
            <Card style={{ marginBottom: 16 }}>
              <h3>Ticket</h3>
              {carrito.length === 0 ? <p style={{textAlign:'center', color:'#aaa'}}>Vacío</p> : (
                carrito.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>{item.nombre} x {item.cantidad}</span>
                    <b>{(item.precio * item.cantidad).toLocaleString()} Bs</b>
                  </div>
                ))
              )}
              <hr />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 'bold' }}>
                <span>Total:</span>
                <span>{total.toLocaleString()} Bs</span>
              </div>
            </Card>

            <Card>
              <label style={{ fontSize: 12 }}>Vendedor</label>
              <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 10, borderRadius: 4, border: `1px solid ${C.border}` }}>
                <option value="">Seleccionar...</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>

              <label style={{ fontSize: 12 }}>Cuenta</label>
              <select value={cuentaId} onChange={e => setCuentaId(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 15, borderRadius: 4, border: `1px solid ${C.border}` }}>
                <option value="">Seleccionar...</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>

              <Btn onClick={() => {
                 if(!vendedorId) return alert("Selecciona vendedor");
                 if(!cuentaId) return alert("Selecciona cuenta");
                 if(carrito.length === 0) return alert("Agrega productos");
                 alert("✅ VENTA REALIZADA - Total: " + total + " Bs");
                 window.location.reload();
              }} style={{ width: '100%', padding: 12 }} disabled={carrito.length === 0}>
                ✅ CONFIRMAR
              </Btn>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// 🏠 APP PRINCIPAL
export default function App() {
  const [seccion, setSeccion] = useState('dashboard');
  const [cuentas, setCuentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  useEffect(() => {
    supabase.from('cuentas').select('*').then(({ data }) => { if (data) setCuentas(data); });
    supabase.from('caja_movimientos').select('*').order('fecha', { ascending: false }).limit(5)
      .then(({ data }) => { if (data) setMovimientos(data); });
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui', background: C.bg }}>
      <div style={{ width: 240, background: '#fff', borderRight: `1px solid ${C.border}`, padding: 20 }}>
        <h2 style={{ color: C.navy, margin: '0 0 20px 0' }}>MEDIMPOR</h2>
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'caja', label: '💰 Caja y Capital' },
          { id: 'ventas', label: '🛒 Ventas' },
          { id: 'importaciones', label: '📦 Importaciones (Próx)' },
          { id: 'inventario', label: ' Inventario (Próx)' },
          { id: 'reportes', label: ' Reportes (Próx)' },
        ].map(item => (
          <div key={item.id} onClick={() => setSeccion(item.id)} style={{
            padding: '10px 15px', marginBottom: 5, borderRadius: 8, cursor: 'pointer',
            background: seccion === item.id ? C.bg : 'transparent',
            color: seccion === item.id ? C.navy : '#666', fontWeight: seccion === item.id ? 'bold' : 'normal'
          }}>
            {item.label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: 30, overflowY: 'auto' }}>
        {seccion === 'dashboard' && <Dashboard cuentas={cuentas} movimientos={movimientos} />}
        {seccion === 'caja' && <Caja cuentas={cuentas} />}
        {seccion === 'ventas' && <Ventas cuentas={cuentas} />}
        {seccion !== 'dashboard' && seccion !== 'caja' && seccion !== 'ventas' && (
          <div style={{ textAlign: 'center', marginTop: 50 }}>
            <h2>🚧 En construcción</h2>
            <p>Próximamente</p>
          </div>
        )}
      </div>
    </div>
  );
}