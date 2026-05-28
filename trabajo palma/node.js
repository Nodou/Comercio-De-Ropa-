const boton
loginButton.addEventListener('click', () => {
  const loginSuccess = false;
  if (!loginSuccess) {
    alert('Tu correo electronica o contraseña son incorrectos. Por favor, inténtalo de nuevo.');
    return;
  }
  console.log('Botón de iniciar sesión pulsado');
});

document.body.appendChild(loginButton);