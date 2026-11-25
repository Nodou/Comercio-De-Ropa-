const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUERTO = process.env.PORT || 3000;

const RAIS = __dirname;
const PUBLIC_DIR = path.join(RAIS, 'public');
const DATA_DIR = path.join(RAIS, 'data');
const UPLOADS_DIR = path.join(RAIS, 'uploads');

[PUBLIC_DIR, DATA_DIR, UPLOADS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const ARCHIVOS = {
  usuarios: path.join(DATA_DIR, 'usuarios.json'),
  productos: path.join(DATA_DIR, 'productos.json'),
  carrito: path.join(DATA_DIR, 'carrito.json'),
  sesiones: path.join(DATA_DIR, 'sesiones.json')
};

function leerJSON(ruta, inicial) {
  if (!fs.existsSync(ruta)) {
    fs.writeFileSync(ruta, JSON.stringify(inicial, null, 2));
    return JSON.parse(JSON.stringify(inicial));
  }
  try {
    return JSON.parse(fs.readFileSync(ruta, 'utf8'));
  } catch (e) {
    return JSON.parse(JSON.stringify(inicial));
  }
}

function escribirJSON(ruta, datos) {
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2));
}

function getDB() {
  const db = {
    usuarios: leerJSON(ARCHIVOS.usuarios, []),
    productos: leerJSON(ARCHIVOS.productos, []),
    carrito: leerJSON(ARCHIVOS.carrito, []),
    sesiones: leerJSON(ARCHIVOS.sesiones, [])
  };
  if (db.productos.length === 0) {
    db.productos = PRODUCTOS_INICIALES();
  }
  return db;
}

function PRODUCTOS_INICIALES() {
  return [
    {
      id: 1,
      titulo: 'Nike Air Max 90',
      nombre: 'Nike Air Max 90',
      marca: 'Nike',
      precio: 120000,
      imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      descripcion: 'Diseño clásico con cámara de aire visible para máxima comodidad urbana.',
      talle: '7 US, 8 US, 8.5 US, 9.5 US',
      talles: ['7 US', '8 US', '8.5 US', '9.5 US'],
      usuario_id: 0,
      usuario_nombre: 'VIPROXXX',
      creado: new Date().toISOString()
    },
    {
      id: 2,
      titulo: 'Adidas Ultraboost',
      nombre: 'Adidas Ultraboost',
      marca: 'Adidas',
      precio: 145000,
      imagen: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400',
      descripcion: 'Zapatillas de alto rendimiento con amortiguación de máxima respuesta.',
      talle: '8 US, 9 US, 10 US, 11 US',
      talles: ['8 US', '9 US', '10 US', '11 US'],
      usuario_id: 0,
      usuario_nombre: 'VIPROXXX',
      creado: new Date().toISOString()
    }
  ];
}

function guardarDB(db) {
  escribirJSON(ARCHIVOS.usuarios, db.usuarios);
  escribirJSON(ARCHIVOS.productos, db.productos);
  escribirJSON(ARCHIVOS.carrito, db.carrito);
  escribirJSON(ARCHIVOS.sesiones, db.sesiones);
}

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

function generarToken() {
  return crypto.randomBytes(24).toString('hex');
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let datos = '';
    req.on('data', chunk => { datos += chunk; });
    req.on('end', () => resolve(datos));
    req.on('error', reject);
  });
}

function obtenerUsuario(db, token) {
  if (!token) return null;
  const sesion = db.sesiones.find(s => s.token === token);
  if (!sesion) return null;
  return db.usuarios.find(u => u.id === sesion.usuario_id) || null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ruta = url.pathname;

  // ---------- RUTAS DE API ----------
  if (ruta.startsWith('/api/')) {
    try {
      await manejarAPI(req, res, url, ruta);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error interno del servidor: ' + e.message }));
    }
    return;
  }

  // Subida de imágenes
  if (ruta.startsWith('/uploads/')) {
    const nombre = path.basename(ruta);
    const filePath = path.join(UPLOADS_DIR, nombre);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Imagen no encontrada');
    }
    return;
  }

  // Exponer productos.json para el catálogo estático
  if (ruta === '/productos.json' && req.method === 'GET') {
    const dbJson = getDB();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(dbJson.productos, null, 2));
    return;
  }

  // ---------- ARCHIVOS ESTÁTICOS ----------
  let archivo = ruta === '/' ? '/index.html' : ruta;
  let filePath = path.join(PUBLIC_DIR, archivo);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Prohibido');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - Página no encontrada</h1>');
  }
});

async function manejarAPI(req, res, url, ruta) {
  const metodo = req.method;
  const db = getDB();

  const enviar = (estado, datos) => {
    res.writeHead(estado, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(datos));
  };

  // Obtener token de sesión
  const cookie = req.headers.cookie || '';
  const token = (cookie.match(/token=([^;]+)/) || [])[1] || null;

  // ---------- PRODUCTOS ----------
  if (ruta === '/api/productos' && metodo === 'GET') {
    const ordenados = [...db.productos].sort((a, b) => b.id - a.id);
    return enviar(200, ordenados);
  }

  if (ruta === '/api/productos' && metodo === 'POST') {
    const usuario = obtenerUsuario(db, token);
    if (!usuario) return enviar(401, { error: 'Debes iniciar sesión para publicar un producto' });

    const datos = await leerCuerpo(req);
    const cuerpo = JSON.parse(datos);
    const { titulo, precio, talle, descripcion, imagen } = cuerpo;

    if (!titulo || !precio || !talle) {
      return enviar(400, { error: 'Faltan datos obligatorios' });
    }

    const nuevoProducto = {
      id: db.productos.length ? Math.max(...db.productos.map(p => p.id)) + 1 : 1,
      titulo,
      precio: parseFloat(precio),
      talle,
      descripcion: descripcion || '',
      imagen: imagen || null,
      usuario_id: usuario.id,
      usuario_nombre: usuario.nombre,
      creado: new Date().toISOString()
    };

    db.productos.push(nuevoProducto);
    guardarDB(db);
    return enviar(201, nuevoProducto);
  }

  // Subida de imagen como archivo
  if (ruta === '/api/subir-imagen' && metodo === 'POST') {
    const usuario = obtenerUsuario(db, token);
    if (!usuario) return enviar(401, { error: 'Debes iniciar sesión' });

    const datos = await leerCuerpo(req);
    const cuerpo = JSON.parse(datos);
    const { nombre, contenido } = cuerpo;

    if (!contenido) return enviar(400, { error: 'No se recibió la imagen' });

    const nombreArchivo = Date.now() + '-' + (nombre || 'img.png').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const buffer = Buffer.from(contenido, 'base64');
    fs.writeFileSync(path.join(UPLOADS_DIR, nombreArchivo), buffer);
    return enviar(200, { url: '/uploads/' + nombreArchivo, nombre: nombreArchivo });
  }

  // ---------- USUARIOS ----------
  if (ruta === '/api/registro' && metodo === 'POST') {
    const datos = JSON.parse(await leerCuerpo(req));
    const { nombre, email, password } = datos;

    if (!nombre || !email || !password) {
      return enviar(400, { error: 'Faltan datos obligatorios' });
    }
    if (password.length < 6) {
      return enviar(400, { error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (db.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return enviar(400, { error: 'Ese correo ya está registrado' });
    }

    const nuevoUsuario = {
      id: db.usuarios.length ? Math.max(...db.usuarios.map(u => u.id)) + 1 : 1,
      nombre,
      email,
      password: hashPassword(password)
    };
    db.usuarios.push(nuevoUsuario);
    guardarDB(db);
    return enviar(201, { ok: true, mensaje: 'Usuario registrado correctamente' });
  }

  if (ruta === '/api/login' && metodo === 'POST') {
    const datos = JSON.parse(await leerCuerpo(req));
    const { email, password } = datos;

    const usuario = db.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!usuario) return enviar(401, { error: 'Usuario no encontrado' });
    if (usuario.password !== hashPassword(password)) {
      return enviar(401, { error: 'Contraseña incorrecta' });
    }

    const nuevoToken = generarToken();
    db.sesiones.push({ token: nuevoToken, usuario_id: usuario.id });
    guardarDB(db);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `token=${nuevoToken}; HttpOnly; Path=/; Max-Age=86400`
    });
    res.end(JSON.stringify({ ok: true, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } }));
    return;
  }

  if (ruta === '/api/logout' && metodo === 'POST') {
    if (token) {
      db.sesiones = db.sesiones.filter(s => s.token !== token);
      guardarDB(db);
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'token=; HttpOnly; Path=/; Max-Age=0'
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (ruta === '/api/sesion' && metodo === 'GET') {
    const usuario = obtenerUsuario(db, token);
    if (!usuario) return enviar(401, { error: 'No hay sesión' });
    return enviar(200, { usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } });
  }

  // ---------- CARRITO ----------
  if (ruta === '/api/carrito' && metodo === 'GET') {
    const usuario = obtenerUsuario(db, token);
    if (!usuario) return enviar(401, { error: 'Debes iniciar sesión para ver el carrito' });

    const items = db.carrito
      .filter(c => c.usuario_id === usuario.id)
      .map(c => {
        const p = db.productos.find(prod => prod.id === c.producto_id);
        return p ? { carrito_id: c.id, producto_id: p.id, titulo: p.titulo, precio: p.precio, imagen: p.imagen, cantidad: c.cantidad, subtotal: p.precio * c.cantidad } : null;
      })
      .filter(Boolean);

    const total = items.reduce((acc, i) => acc + i.subtotal, 0);
    return enviar(200, { items, total });
  }

  if (ruta === '/api/carrito' && metodo === 'POST') {
    const usuario = obtenerUsuario(db, token);
    if (!usuario) return enviar(401, { error: 'Debes iniciar sesión' });

    const datos = JSON.parse(await leerCuerpo(req));
    const producto_id = parseInt(datos.producto_id);

    const existeCarrito = db.carrito.find(c => c.usuario_id === usuario.id && c.producto_id === producto_id);
    if (existeCarrito) {
      existeCarrito.cantidad += 1;
    } else {
      db.carrito.push({
        id: db.carrito.length ? Math.max(...db.carrito.map(c => c.id)) + 1 : 1,
        usuario_id: usuario.id,
        producto_id,
        cantidad: 1
      });
    }
    guardarDB(db);
    return enviar(200, { ok: true });
  }

  if (ruta === '/api/carrito/cantidad' && metodo === 'POST') {
    const usuario = obtenerUsuario(db, token);
    if (!usuario) return enviar(401, { error: 'Debes iniciar sesión' });

    const datos = JSON.parse(await leerCuerpo(req));
    const carrito_id = parseInt(datos.carrito_id);
    const delta = parseInt(datos.delta);

    if (![1, -1].includes(delta)) return enviar(400, { error: 'Cambio de cantidad inválido' });

    const item = db.carrito.find(c => c.usuario_id === usuario.id && c.id === carrito_id);
    if (!item) return enviar(404, { error: 'Item no encontrado en el carrito' });

    const nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad < 1) return enviar(400, { error: 'La cantidad mínima es 1. Usá Eliminar para quitar el producto.' });

    item.cantidad = nuevaCantidad;
    guardarDB(db);
    return enviar(200, { ok: true, cantidad: item.cantidad });
  }

  if (ruta === '/api/carrito' && metodo === 'DELETE') {
    const usuario = obtenerUsuario(db, token);
    if (!usuario) return enviar(401, { error: 'Debes iniciar sesión' });
    const datos = JSON.parse(await leerCuerpo(req));
    const carrito_id = datos.carrito_id;
    db.carrito = db.carrito.filter(c => !(c.usuario_id === usuario.id && c.id === parseInt(carrito_id)));
    guardarDB(db);
    return enviar(200, { ok: true });
  }

  if (ruta === '/api/checkout' && metodo === 'POST') {
    const usuario = obtenerUsuario(db, token);
    if (!usuario) return enviar(401, { error: 'Debes iniciar sesión' });
    db.carrito = db.carrito.filter(c => c.usuario_id !== usuario.id);
    guardarDB(db);
    return enviar(200, { ok: true, mensaje: 'Compra realizada correctamente' });
  }

  enviar(404, { error: 'Ruta no encontrada' });
}

server.listen(PUERTO, () => {
  console.log(`✅ Servidor VIPROXXX corriendo en http://localhost:${PUERTO}`);
});