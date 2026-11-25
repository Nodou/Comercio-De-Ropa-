// ========== UTILIDADES ==========
async function api(metodo, ruta, cuerpo) {
    const opciones = { method: metodo, headers: {} };
    if (cuerpo) {
        opciones.headers['Content-Type'] = 'application/json';
        opciones.body = JSON.stringify(cuerpo);
    }
    const res = await fetch('/api' + ruta, opciones);
    let datos = null;
    try { datos = await res.json(); } catch (e) {}
    return { estado: res.status, datos };
}

function esc(texto) {
    const div = document.createElement('div');
    div.textContent = texto == null ? '' : String(texto);
    return div.innerHTML;
}

function formatearPrecio(precio) {
    if (typeof precio === 'number') {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(precio);
    }
    return precio || '';
}

function nombreProducto(prod) { return prod.nombre || prod.titulo || 'Producto'; }
function marcaProducto(prod) { return prod.marca || 'VIPROXXX'; }
function imagenProducto(prod) { return prod.imagen || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'; }
function tallesProducto(prod) {
    if (Array.isArray(prod.talles) && prod.talles.length) return prod.talles;
    if (typeof prod.talle === 'string' && prod.talle.trim()) return prod.talle.split(',').map(t => t.trim()).filter(Boolean);
    return [];
}

// ========== NAVEGACIÓN / SESIÓN ==========
async function actualizarNav() {
    const elUsuario = document.getElementById('nav-usuario');
    const elLogin = document.getElementById('nav-login');
    const elLogout = document.getElementById('nav-logout');
    if (!elUsuario && !elLogin && !elLogout) return;

    const sesion = await api('GET', '/sesion');
    const logueado = sesion.estado === 200;

    if (elUsuario) elUsuario.style.display = logueado ? 'inline' : 'none';
    if (elLogin) elLogin.style.display = logueado ? 'none' : 'inline';
    if (elLogout) elLogout.style.display = logueado ? 'inline' : 'none';

    if (logueado && elUsuario) {
        elUsuario.style.color = 'var(--orange-viprox)';
        elUsuario.style.fontWeight = 'bold';
        elUsuario.textContent = '👤 ' + sesion.datos.usuario.nombre;
    }

    if (elLogout && !elLogout.dataset.bound) {
        elLogout.dataset.bound = '1';
        elLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            await api('POST', '/logout');
            window.location.href = '/';
        });
    }
}

// ========== CARRUSEL ==========
function initCarousel() {
    const slides = Array.from(document.querySelectorAll('.carousel-slide .slide'));
    const dotsWrap = document.getElementById('carousel-dots');
    const prev = document.getElementById('carousel-prev');
    const next = document.getElementById('carousel-next');
    const container = document.querySelector('.carousel-container');
    if (!slides.length || !dotsWrap) return;

    let idx = 0;
    let timer = null;

    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Ir al slide ${i + 1}`);
        dot.addEventListener('click', () => go(i, true));
        dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function render() {
        slides.forEach((s, i) => s.classList.toggle('active', i === idx));
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }
    function go(n, manual) {
        idx = (n + slides.length) % slides.length;
        render();
        if (manual) restart();
    }
    function restart() {
        clearInterval(timer);
        timer = setInterval(() => go(idx + 1, false), 5000);
    }

    if (prev) prev.addEventListener('click', () => go(idx - 1, true));
    if (next) next.addEventListener('click', () => go(idx + 1, true));
    if (container) {
        container.addEventListener('mouseenter', () => clearInterval(timer));
        container.addEventListener('mouseleave', restart);
    }
    restart();
}

// ========== MODAL PRODUCTO ==========
function initModalDetalle() {
    const modal = document.getElementById('modal-detalle');
    const btnCerrar = document.getElementById('btn-cerrar-detalle');
    if (!modal) return;

    function cerrar() {
        modal.classList.add('oculto');
        modal.setAttribute('aria-hidden', 'true');
    }
    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('oculto')) cerrar();
    });

    const loginReq = document.getElementById('login-required');
    const loginClose = document.getElementById('login-required-close');
    if (loginReq) {
        if (loginClose) loginClose.addEventListener('click', () => { loginReq.style.display = 'none'; });
        loginReq.addEventListener('click', (e) => { if (e.target === loginReq) loginReq.style.display = 'none'; });
    }
}

function abrirDetalleProducto(prod) {
    const modal = document.getElementById('modal-detalle');
    if (!modal) return;

    document.getElementById('modal-img').src = imagenProducto(prod);
    document.getElementById('modal-img').alt = nombreProducto(prod);
    document.getElementById('modal-marca').textContent = marcaProducto(prod);
    document.getElementById('modal-nombre').textContent = nombreProducto(prod);
    document.getElementById('modal-precio').textContent = formatearPrecio(prod.precio);
    document.getElementById('modal-desc').textContent = prod.descripcion || 'Sin descripción.';

    const contTalles = document.getElementById('modal-talles');
    contTalles.innerHTML = '';
    const talles = tallesProducto(prod);
    (talles.length ? talles : ['Consultar']).forEach(t => {
        const span = document.createElement('span');
        span.textContent = t;
        contTalles.appendChild(span);
    });

    const btn = document.getElementById('modal-agregar');
    btn.onclick = () => { if (prod.id != null) agregarAlCarrito(prod.id); };

    modal.classList.remove('oculto');
    modal.setAttribute('aria-hidden', 'false');
}

// ========== TIENDA / CATÁLOGO ==========
async function cargarProductos() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const res = await api('GET', '/productos');
    const productos = res.datos;

    if (!productos || productos.length === 0) {
        grid.innerHTML = '<div class="empty-state">Aún no hay productos publicados. ¡Sé el primero en vender!</div>';
        return;
    }

    grid.innerHTML = '';
    productos.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const talles = tallesProducto(p);
        card.innerHTML = `
            <img class="product-img" src="${esc(imagenProducto(p))}" alt="${esc(nombreProducto(p))}" loading="lazy">
            <p class="product-brand">${esc(marcaProducto(p))}</p>
            <h3>${esc(nombreProducto(p))}</h3>
            <p class="product-price">${esc(formatearPrecio(p.precio))}</p>
            <p class="product-talle">Talles: ${esc(talles.length ? talles.join(', ') : '-')}</p>
            <button class="btn-primary" data-agregar="${p.id}">Añadir al Carrito</button>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.closest('[data-agregar]')) return;
            abrirDetalleProducto(p);
        });
        grid.appendChild(card);
    });

    grid.querySelectorAll('[data-agregar]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            agregarAlCarrito(parseInt(btn.dataset.agregar, 10));
        });
    });
}

let shopMsgTimer;
function mostrarMensajeTienda(texto, tipo = 'ok') {
    const msg = document.getElementById('shop-mensaje');
    if (!msg) return;
    msg.className = `mensaje ${tipo} shop-mensaje`;
    msg.textContent = texto;
    clearTimeout(shopMsgTimer);
    shopMsgTimer = setTimeout(() => {
        msg.className = 'mensaje shop-mensaje';
        msg.textContent = '';
    }, 2200);
}

async function agregarAlCarrito(producto_id) {
    const res = await api('POST', '/carrito', { producto_id });
    if (res.estado === 401) {
        const modal = document.getElementById('login-required');
        if (modal) { modal.style.display = 'flex'; return; }
        window.location.href = '/login-usuario.html';
        return;
    }
    if (res.estado === 200) {
        mostrarMensajeTienda('Agregado correctamente');
    } else {
        mostrarMensajeTienda((res.datos && res.datos.error) || 'No se pudo agregar al carrito', 'error');
    }
}

// ========== CARRITO ==========
async function cargarCarrito() {
    const cont = document.getElementById('cart-content');
    if (!cont) return;
    const msg = document.getElementById('cart-mensaje');

    const res = await api('GET', '/carrito');
    if (res.estado === 401) {
        cont.innerHTML = '<div class="empty-state">Debés iniciar sesión para ver tu carrito. <a href="/login-usuario.html" style="color:var(--orange-viprox);">Iniciar sesión</a></div>';
        return;
    }

    const { items, total } = res.datos || { items: [], total: 0 };
    if (!items.length) {
        cont.innerHTML = '<div class="empty-state">Tu carrito está vacío. <a href="/" style="color:var(--orange-viprox);">Ir a la tienda</a></div>';
        return;
    }

    cont.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        const disableMinus = item.cantidad <= 1;
        div.innerHTML = `
            <img src="${esc(item.imagen || imagenProducto(item))}" alt="${esc(item.titulo)}">
            <div class="cart-item-info">
                <h3>${esc(item.titulo)}</h3>
                <div class="qty-control" aria-label="Cantidad">
                    <button class="qty-btn" data-cantidad="-1" data-id="${item.carrito_id}" ${disableMinus ? 'disabled title="Usá Eliminar para quitar el producto"' : ''}>−</button>
                    <span class="qty-value">${item.cantidad}</span>
                    <button class="qty-btn" data-cantidad="1" data-id="${item.carrito_id}">+</button>
                </div>
                <p>Precio: ${esc(formatearPrecio(item.precio))}</p>
                <p class="subtotal">Subtotal: ${esc(formatearPrecio(item.subtotal))}</p>
            </div>
            <button class="btn-primary btn-delete" data-eliminar="${item.carrito_id}">Eliminar</button>
        `;
        cont.appendChild(div);
    });

    const totalDiv = document.createElement('div');
    totalDiv.innerHTML = `
        <div class="cart-total">Total: <span>${esc(formatearPrecio(total))}</span></div>
        <div class="cart-actions"><button class="btn-primary" id="btn-checkout">Finalizar Compra</button></div>
    `;
    cont.appendChild(totalDiv);

    cont.querySelectorAll('[data-eliminar]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const r = await api('DELETE', '/carrito', { carrito_id: parseInt(btn.dataset.eliminar, 10) });
            if (r.estado === 200) cargarCarrito();
        });
    });

    cont.querySelectorAll('[data-cantidad]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const delta = parseInt(btn.dataset.cantidad, 10);
            const carritoId = parseInt(btn.dataset.id, 10);
            if (delta === -1 && btn.disabled) return;
            const r = await api('POST', '/carrito/cantidad', { carrito_id: carritoId, delta });
            if (r.estado === 200) cargarCarrito();
        });
    });

    document.getElementById('btn-checkout').addEventListener('click', async () => {
        const r = await api('POST', '/checkout');
        if (r.estado === 200) {
            if (msg) { msg.className = 'mensaje ok'; msg.textContent = '¡Compra realizada correctamente!'; }
            setTimeout(() => { window.location.href = '/'; }, 1500);
        } else if (r.estado === 401) {
            window.location.href = '/login-usuario.html';
        }
    });
}

// ========== SUBIR PRODUCTO ==========
async function initSubir() {
    const form = document.getElementById('subir-form');
    if (!form) return;
    const msg = document.getElementById('subir-mensaje');

    const sesion = await api('GET', '/sesion');
    if (sesion.estado === 401) {
        if (msg) { msg.className = 'mensaje error'; msg.textContent = 'Debés iniciar sesión para publicar productos.'; }
        form.style.display = 'none';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (msg) { msg.className = 'mensaje'; msg.textContent = ''; }

        const titulo = document.getElementById('titulo').value.trim();
        const precio = parseFloat(document.getElementById('precio').value);
        const talle = document.getElementById('talle').value;
        const descripcion = document.getElementById('descripcion').value.trim();
        const archivo = document.getElementById('imagen').files[0];
        if (!archivo) { if (msg) { msg.className = 'mensaje error'; msg.textContent = 'Debés seleccionar una imagen.'; } return; }

        try {
            const leido = await leerImagenComoBase64(archivo);
            const subida = await api('POST', '/subir-imagen', { nombre: archivo.name, contenido: leido });
            if (subida.estado !== 200) { if (msg) { msg.className = 'mensaje error'; msg.textContent = (subida.datos && subida.datos.error) || 'Error al subir la imagen.'; } return; }
            const creado = await api('POST', '/productos', { titulo, precio, talle, descripcion, imagen: subida.datos.url });
            if (creado.estado === 201) {
                if (msg) { msg.className = 'mensaje ok'; msg.textContent = '¡Producto publicado correctamente!'; }
                form.reset();
                setTimeout(() => { window.location.href = '/'; }, 1200);
            } else if (msg) {
                msg.className = 'mensaje error';
                msg.textContent = (creado.datos && creado.datos.error) || 'Error al publicar el producto.';
            }
        } catch (err) {
            if (msg) { msg.className = 'mensaje error'; msg.textContent = 'Error inesperado.'; }
        }
    });
}

function leerImagenComoBase64(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });
}

// ========== LOGIN / REGISTRO ==========
async function initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;
    const msg = document.getElementById('login-mensaje');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (msg) { msg.className = 'mensaje'; msg.textContent = ''; }
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const res = await api('POST', '/login', { email, password });
        if (res.estado === 200) window.location.href = '/';
        else if (msg) { msg.className = 'mensaje error'; msg.textContent = (res.datos && res.datos.error) || 'Error al iniciar sesión.'; }
    });
}

async function initRegistro() {
    const form = document.getElementById('registro-form');
    if (!form) return;
    const msg = document.getElementById('registro-mensaje');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (msg) { msg.className = 'mensaje'; msg.textContent = ''; }
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        if (password.length < 6) { if (msg) { msg.className = 'mensaje error'; msg.textContent = 'La contraseña debe tener al menos 6 caracteres.'; } return; }
        const registro = await api('POST', '/registro', { nombre, email, password });
        if (registro.estado !== 201) { if (msg) { msg.className = 'mensaje error'; msg.textContent = (registro.datos && registro.datos.error) || 'Error al registrar usuario.'; } return; }
        const login = await api('POST', '/login', { email, password });
        if (login.estado === 200) {
            if (msg) { msg.className = 'mensaje ok'; msg.textContent = '¡Cuenta creada e ingreso correcto!'; }
            setTimeout(() => { window.location.href = '/'; }, 1000);
        } else {
            window.location.href = '/login-usuario.html';
        }
    });
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    actualizarNav();
    initCarousel();
    initModalDetalle();
    cargarProductos();
    cargarCarrito();
    initSubir();
    initLogin();
    initRegistro();
});
