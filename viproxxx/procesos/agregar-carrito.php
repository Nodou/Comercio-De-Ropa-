<?php

session_start();

include("../config/conexion.php");

if(!isset($_SESSION['usuario_id'])){
    die("Debes iniciar sesión");
}

$usuario_id = $_SESSION['usuario_id'];
$producto_id = $_POST['producto_id'];

$verificar = $conn->query("
SELECT * FROM carrito
WHERE usuario_id='$usuario_id'
AND producto_id='$producto_id'
");

if($verificar->num_rows > 0){

    $conn->query("
    UPDATE carrito
    SET cantidad = cantidad + 1
    WHERE usuario_id='$usuario_id'
    AND producto_id='$producto_id'
    ");

}else{

    $conn->query("
    INSERT INTO carrito
    (usuario_id, producto_id, cantidad)
    VALUES
    ('$usuario_id','$producto_id',1)
    ");

}

header("Location: ../carrito.php");

?>