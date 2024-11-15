El gestor de tareas que estás implementando es una aplicación web que permite a los usuarios gestionar sus tareas (pendientes y completadas) de manera organizada. 
Objetivo del Gestor de Tareas

El objetivo principal es proporcionar una interfaz simple e intuitiva para que los usuarios puedan:

    Agregar nuevas tareas con título, descripción, fecha y estado inicial ("pendiente").
    Ver listas separadas de tareas pendientes y completadas.
    Actualizar tareas existentes, cambiando su información.
    Completar tareas, moviéndolas de "pendientes" a "completadas".
    Eliminar tareas que ya no sean necesarias, tanto de pendientes como de completadas.
    Cerrar sesión para asegurar la seguridad del sistema.

Principales Funcionalidades

    Autenticación con Token:
        Usa un token almacenado en localStorage para verificar la identidad del usuario en cada operación.
        Esto asegura que cada usuario solo puede gestionar sus propias tareas.

    Interacción con el Servidor:
        Usa la API del servidor para enviar solicitudes como:
            GET: Para obtener tareas pendientes o completadas.
            POST: Para agregar una nueva tarea o marcar una como completada.
            PUT: Para actualizar los datos de una tarea existente.
            DELETE: Para eliminar tareas.
        Todas estas solicitudes incluyen el token de autenticación.

    Gestión de Tareas en la Página:
        Formularios para agregar y actualizar tareas.
        Listas dinámicas que muestran las tareas pendientes y completadas en secciones separadas.
        Botones interactivos para realizar acciones como completar, actualizar o eliminar tareas.

    Cierre de Sesión:
        Un botón para cerrar la sesión, que elimina el token del almacenamiento local y redirige al usuario a la página de inicio de sesión.
