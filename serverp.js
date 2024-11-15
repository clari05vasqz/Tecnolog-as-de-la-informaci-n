const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes, where } = require('sequelize');
const path = require('path');

const app = express();
const port = 3000;
const SECRET_KEY = 'secret_key';
const revokedTokens = new Set(); // lista para almacenar token revocados temporalmente

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.get('/notas.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'notas.html'));
});

// Configurar SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'p1.sqlite', 
});

// Tabla de usuarios
const Usuario = sequelize.define('usuarios', { 
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
});

// Tabla de tareas
const Tarea = sequelize.define('tareas', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    estado: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

// Tabla de tareas completadas
const Completada = sequelize.define('completadas', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    estado: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

// Estableciendo las relaciones
Usuario.hasMany(Tarea, { foreignKey: 'usuarioId' }); // Un usuario puede tener muchas tareas
Tarea.belongsTo(Usuario, { foreignKey: 'usuarioId' }); // Cada tarea pertenece a un usuario

Usuario.hasMany(Completada, { foreignKey: 'usuarioId' }); // Un usuario puede tener muchas tareas completadas
Completada.belongsTo(Usuario, { foreignKey: 'usuarioId' }); // Cada tarea completada pertenece a un usuario

Tarea.hasMany(Completada, { foreignKey: 'tareaId' }); // Una tarea puede estar en tareas completadas
Completada.belongsTo(Tarea, { foreignKey: 'tareaId' }); // Cada tarea completada corresponde a una tarea

// Sincronizar el modelo con la base de datos
sequelize.sync()
    .then(() => {
        console.log("Tablas sincronizadas.");
    })
    .catch(error => {
        console.error("Error al sincronizar las tablas: ", error);
    });

module.exports = { Usuario, Tarea, Completada };

// Registro de usuario
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10); // Encriptar la contraseña

    try {
        const user = await Usuario.create({ username, password: hashedPassword, email }); 
        res.status(201).json({ message: 'Usuario registrado exitosamente' });
    } catch (err) {
        console.error(err); // Para ver el error en la consola
        res.status(400).json({ message: 'Error al registrar usuario' });
    }
});

// Inicio de sesión
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await Usuario.findOne({ where: { username } });
    if (!user) {
        return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Crear el token JWT
    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: 'Inicio de sesión exitoso', token });
});

// Cerrar sesión
app.post('/logout', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        revokedTokens.add(token); // añade el token a la lista de revocados
        res.json({ message: 'Sesión cerrada exitosamente' }); 
    } else {
        res.status(400).json({ message: 'Token no proporcionado' });
    }
});

// Middleware para verificar el token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.sendStatus(401); // Si no hay token
    }

    // añadido //

    if (revokedTokens.has(token)) {
        return res.status(403).json({message: 'Token invalido. Inicia sesion nuevamente'})
    }

    // fin del añadido //

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Si el token es inválido o ha expirado
        }
        req.user = user;
        next();
    });
};

// ------------------------ METODOS PARA LA SECCIONA DE TAREAS ---------------------------------- //

// Agregar una nueva tarea
app.post('/tareas', authenticateToken, async (req, res) => {
    const { titulo, descripcion, fecha, estado } = req.body;

    try {
        const tarea = await Tarea.create({
            titulo,
            descripcion,
            fecha,
            estado: 'Pendiente',
            usuarioId: req.user.userId // Asociar la tarea al usuario
        });
        res.status(201).json(tarea);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: 'Error al agregar la tarea' });
    }
});

// Eliminar una tarea
app.delete('/tareas/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const tarea = await Tarea.destroy({
            where: { id, usuarioId: req.user.userId } // Solo el usuario puede eliminar su tarea
        });

        if (!tarea) {
            return res.status(404).json({ message: 'Tarea no encontrada' });
        }
        res.json({ message: 'Tarea eliminada exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: 'Error al eliminar la tarea' });
    }
});

// Actualizar una tarea
app.put('/tareas/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { titulo, descripcion, fecha, estado } = req.body;

    try {
        const [updated] = await Tarea.update(
            { titulo, descripcion, fecha, estado },
            { where: { id, usuarioId: req.user.userId } } // Solo el usuario puede actualizar su tarea
        );

        if (updated) {
            const updatedTarea = await Tarea.findOne({ where: { id } });
            return res.status(200).json(updatedTarea);
        }
        throw new Error('Tarea no encontrada');
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: 'Error al actualizar la tarea' });
    }
});

// Marcar tarea como completada
app.post('/tareas/completar/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const tarea = await Tarea.findOne({ where: { id, usuarioId: req.user.userId } });
        if (!tarea) {
            return res.status(404).json({ message: 'Tarea no encontrada' });
        }

        // Crear una nueva tarea completada
        await Completada.create({
            titulo: tarea.titulo,
            descripcion: tarea.descripcion,
            fecha: tarea.fecha,
            estado: 'completada', // Cambia el estado a 'completada'
            usuarioId: req.user.userId,
            tareaId: tarea.id // Asociar la tarea completada a la tarea original
        });

        await Tarea.destroy({ where: { id } }); // Eliminar la tarea de la tabla de tareas

        res.json({ message: 'Tarea marcada como completada' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: 'Error al completar la tarea' });
    }
});

// Obtener las tareas del usuario
app.get('/tareas', authenticateToken, async (req, res) => {
    try {
        const tareas = await Tarea.findAll({
            where: { usuarioId: req.user.userId } // Obtener solo las tareas del usuario autenticado
        });
        res.json(tareas);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: 'Error al obtener las tareas' });
    }
});

// Obtener tareas completadas de un usuario
app.get('/tareas/completadas', authenticateToken, async (req, res) => {
    try {
        const completadas = await Completada.findAll({ where: { usuarioId: req.user.userId } });
        res.json(completadas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener tareas completadas' });
    }
});

// Eliminar tarea completada
app.delete('/completadas/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await Completada.destroy({ where: { id, usuarioId: req.user.userId } });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Tarea completada no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar tarea completada' });
    }
});

// ---------------------------------------------------------------------------------------------- //

// Ruta protegida
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Esta es una ruta protegida', userId: req.user.userId });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`API funcionando en http://localhost:${port}`);
});