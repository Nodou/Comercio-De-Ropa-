<?php

session_start();

include("config/conexion.php");

if(!isset($_SESSION['usuario_id'])){
    die("Debes iniciar sesión para ver el carrito");
}

$usuario_id = $_SESSION['usuario_id'];

$sql = "
SELECT carrito.id AS carrito_id,
       carrito.cantidad,
       productos.titulo,
       productos.precio,
       productos.imagen
FROM carrito
INNER JOIN productos
ON carrito.producto_id = productos.id
WHERE carrito.usuario_id = '$usuario_id'
";

$resultado = $conn->query($sql);

$total = 0;

?>

<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Carrito</title>
<link rel="stylesheet" href="styles.css">

<style>

.cart-page{
    padding:2rem;
    max-width:1000px;
    margin:auto;
}

.cart-item{
    display:flex;
    align-items:center;
    gap:20px;
    border-bottom:1px solid #ddd;
    padding:20px 0;
}

.cart-item img{
    width:120px;
    height:120px;
    object-fit:cover;
}

.cart-total{
    margin-top:30px;
    font-size:24px;
    font-weight:bold;
}

</style>

</head>

<body>

<header>
    <div class="logo">
        <a href="index.php">VIPROXXX</a>
    </div>

    <nav>
        <a href="index.php">Tienda</a>
        <a href="carrito.php" class="active">Carrito</a>
    </nav>
</header>

<main class="cart-page">

<h2>Mi Carrito</h2>

<?php while($item = $resultado->fetch_assoc()) { ?>

<?php

$subtotal =
$item['precio'] * $item['cantidad'];

$total += $subtotal;

?>

<div class="cart-item">

    <img
    src="uploads/<?php echo $item['imagen']; ?>">

    <div>

        <h3>
            <?php echo $item['titulo']; ?>
        </h3>

        <p>
            Cantidad:
            <?php echo $item['cantidad']; ?>
        </p>

        <p>
            Precio:
            $<?php echo $item['precio']; ?>
        </p>

        <p>
            Subtotal:
            $<?php echo $subtotal; ?>
        </p>

        <form
        action="procesos/eliminar-carrito.php"
        method="POST">

            <input
            type="hidden"
            name="id"
            value="<?php echo $item['carrito_id']; ?>">

            <button
            type="submit"
            class="btn-primary">

                Eliminar

            </button>

        </form>

    </div>

</div>

<?php } ?>

<div class="cart-total">

    Total:
    $<?php echo $total; ?>

</div>

</main>

</body>
</html>