<?php

session_start();

include("../config/conexion.php");

$usuario_id = $_SESSION['usuario_id'];

$conn->query("
DELETE FROM carrito
WHERE usuario_id='$usuario_id'
");

echo "
<h2>Compra realizada correctamente</h2>
<a href='../index.php'>Volver a la tienda</a>
";

?>