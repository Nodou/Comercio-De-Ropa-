<?php

include("../config/conexion.php");

$id = $_POST['id'];

$conn->query("
DELETE FROM carrito
WHERE id='$id'
");

header("Location: ../carrito.php");

?>