<?php

session_start();

include("../config/conexion.php");

$titulo = $_POST['titulo'];
$precio = $_POST['precio'];
$talle = $_POST['talle'];
$descripcion = $_POST['descripcion'];

$imagen = $_FILES['imagen']['name'];

move_uploaded_file(
    $_FILES['imagen']['tmp_name'],
    "../uploads/" . $imagen
);

$usuario_id = $_SESSION['usuario_id'];

$sql = "INSERT INTO productos
(titulo,precio,talle,descripcion,imagen,usuario_id)
VALUES
('$titulo','$precio','$talle',
'$descripcion','$imagen','$usuario_id')";

$sql = "INSERT INTO productos
(titulo,precio,talle,descripcion,imagen,usuario_id)
VALUES
('$titulo','$precio','$talle',
'$descripcion','$imagen','$usuario_id')";

if($conn->query($sql)){

    header("Location: ../index.php");
    exit();

}else{

    echo "ERROR SQL: " . $conn->error;

}

?>