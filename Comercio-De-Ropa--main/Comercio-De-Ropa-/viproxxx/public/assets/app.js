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

// ========== NAVEGACIÓN / SESIÓN ==========
async function actualizarNav() {
    const sesion = await api('GET', '/sesion');
    const logueado = sesion.estado === 200;

    const elUsuario = document.getElementById('nav-usuario');
    const elLogin = document.getElementById('nav-login');
    const elLogout = document.getElementById('nav-logout');

    if (elUsuario) elUsuario.style.display = logueado ? 'inline' : 'none';
    if (elLogin) elLogin.style.display = logueado ? 'none' : 'inline';
    if (elLogout) elLogout.style.display = logueado ? 'inline' : 'none';

    if (logueado && elUsuario) {
        elUsuario.style.color = 'var(--orange-viprox)';
        elUsuario.style.fontWeight = 'bold';
        elUsuario.textContent = '👤 ' + sesion.datos.usuario.nombre;
    }

    if (elLogout) {
        elLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            await api('POST', '/logout');
            window.location.href = '/';
        });
    }
}

// ========== TIENDA (index.html) ==========
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
        const imagenHtml = p.imagen
            ? `<img class="product-img" src="${p.imagen}" alt="${esc(p.titulo)}">`
            : `<img class="product-img" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" alt="Zapatilla">`;
        card.innerHTML = `
            ${imagenHtml}
            <h3>${esc(p.titulo)}</h3>
            <p class="product-price">$${p.precio.toFixed(2)}</p>
            <p class="product-talle">Talle: ${p.talle}</p>
            ${p.descripcion ? `<p class="product-talle">${esc(p.descripcion)}</p>` : ''}
            <button class="btn-primary" data-agregar="${p.id}">Añadir al Carrito</button>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll('[data-agregar]').forEach(btn => {
        btn.addEventListener('click', () => agregarAlCarrito(parseInt(btn.dataset.agregar)));
    });
}

async function agregarAlCarrito(producto_id) {
    const res = await api('POST', '/carrito', { producto_id });
    if (res.estado === 401) {
        document.getElementById('login-required').style.display = 'flex';
        return;
    }
    if (res.estado === 200) {
        window.location.href = '/carrito.html';
    }
}

// ========== CARRITO (carrito.html) ==========
async function cargarCarrito() {
    const cont = document.getElementById('cart-content');
    if (!cont) return;
    const msg = document.getElementById('cart-mensaje');

    const res = await api('GET', '/carrito');
    if (res.estado === 401) {
        cont.innerHTML = '<div class="empty-state">Debés iniciar sesión para ver tu carrito.</div>';
        return;
    }

    const { items, total } = res.datos;

    if (items.length === 0) {
        cont.innerHTML = '<div class="empty-state">Tu carrito está vacío. <a href="/" style="color:var(--orange-viprox);">Ir a la tienda</a></div>';
        return;
    }

    cont.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        const imagenHtml = item.imagen
            ? `<img src="${item.imagen}" alt="${esc(item.titulo)}">`
            : `<img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200" alt="Zapatilla">`;
        div.innerHTML = `
            ${imagenHtml}
            <div class="cart-item-info">
                <h3>${esc(item.titulo)}</h3>
                <p>Cantidad: ${item.cantidad}</p>
                <p>Precio: $${item.precio.toFixed(2)}</p>
                <p class="subtotal">Subtotal: $${item.subtotal.toFixed(2)}</p>
            </div>
            <button class="btn-primary" data-eliminar="${item.carrito_id}">Eliminar</button>
        `;
        cont.appendChild(div);
    });

    const totalDiv = document.createElement('div');
    totalDiv.innerHTML = `
        <div class="cart-total">Total: <span>$${total.toFixed(2)}</span></div>
        <div class="cart-actions">
            <button class="btn-primary" id="btn-checkout">Finalizar Compra</button>
        </div>
    `;
    cont.appendChild(totalDiv);

    cont.querySelectorAll('[data-eliminar]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const r = await api('DELETE', '/carrito', { carrito_id: parseInt(btn.dataset.eliminar) });
            if (r.estado === 200) {
                cargarCarrito();
            }
        });
    });

    document.getElementById('btn-checkout').addEventListener('click', async () => {
        const r = await api('POST', '/checkout');
        if (r.estado === 200) {
            msg.className = 'mensaje ok';
            msg.textContent = '¡Compra realizada correctamente!';
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
        msg.className = 'mensaje error';
        msg.textContent = 'Debés iniciar sesión para publicar productos.';
        form.style.display = 'none';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.className = 'mensaje';
        msg.textContent = '';

        const titulo = document.getElementById('titulo').value.trim();
        const precio = parseFloat(document.getElementById('precio').value);
        const talle = document.getElementById('talle').value;
        const descripcion = document.getElementById('descripcion').value.trim();
        const archivo = document.getElementById('imagen').files[0];

        if (!archivo) {
            msg.className = 'mensaje error';
            msg.textContent = 'Debés seleccionar una imagen.';
            return;
        }

        try {
            const leido = await leerImagenComoBase64(archivo);
            const subida = await api('POST', '/subir-imagen', {
                nombre: archivo.name,
                contenido: leido
            });

            if (subida.estado !== 200) {
                msg.className = 'mensaje error';
                msg.textContent = subida.datos.error || 'Error al subir la imagen.';
                return;
            }

            const creado = await api('POST', '/productos', {
                titulo, precio, talle, descripcion, imagen: subida.datos.url
            });

            if (creado.estado === 201) {
                msg.className = 'mensaje ok';
                msg.textContent = '¡Producto publicado correctamente!';
                form.reset();
                setTimeout(() => { window.location.href = '/'; }, 1200);
            } else {
                msg.className = 'mensaje error';
                msg.textContent = creado.datos.error || 'Error al publicar el producto.';
            }
        } catch (err) {
            msg.className = 'mensaje error';
            msg.textContent = 'Error inesperado.';
        }
    });
}

function leerImagenComoBase64(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });
}

// ========== LOGIN ==========
async function initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;
    const msg = document.getElementById('login-mensaje');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.className = 'mensaje';
        msg.textContent = '';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const res = await api('POST', '/login', { email, password });
        if (res.estado === 200) {
            window.location.href = '/';
        } else {
            msg.className = 'mensaje error';
            msg.textContent = res.datos.error || 'Error al iniciar sesión.';
        }
    });
}

// ========== REGISTRO ==========
async function initRegistro() {
    const form = document.getElementById('registro-form');
    if (!form) return;
    const msg = document.getElementById('registro-mensaje');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.className = 'mensaje';
        msg.textContent = '';

        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (password.length < 6) {
            msg.className = 'mensaje error';
            msg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        const registro = await api('POST', '/registro', { nombre, email, password });
        if (registro.estado !== 201) {
            msg.className = 'mensaje error';
            msg.textContent = registro.datos.error || 'Error al registrar usuario.';
            return;
        }

        const login = await api('POST', '/login', { email, password });
        if (login.estado === 200) {
            msg.className = 'mensaje ok';
            msg.textContent = '¡Cuenta creada e ingreso correcto!';
            setTimeout(() => { window.location.href = '/'; }, 1000);
        } else {
            window.location.href = '/login-usuario.html';
        }
    });
}

// ========== ESCAPADO HTML ==========
function esc(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    actualizarNav();
    cargarProductos();
    cargarCarrito();
    initSubir();
    initLogin();
    initRegistro();
});
