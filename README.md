# Poker Real-Time Backend

Backend de poker multiplayer con comunicación en tiempo real mediante WebSockets.

## Tech Stack

- **Runtime:** Node.js + ES Modules
- **API:** Express.js (REST)
- **Real-Time:** Socket.IO (WebSocket + Polling fallback)
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT (JSON Web Tokens)

## Architecture

```
├── src/
│   ├── server.js              # Entry point - HTTP + Socket.IO server
│   ├── config/
│   │   └── db.js              # MongoDB connection (connection pooling)
│   ├── controllers/
│   │   ├── socket.controller.js   # WebSocket event handlers
│   │   ├── game.controller.js     # Game CRUD (REST)
│   │   ├── table.controller.js    # Table CRUD (REST)
│   │   └── user.controller.js     # User operations (REST)
│   ├── models/
│   │   ├── User.js            # Player schema (stack, wins, stats)
│   │   ├── Table.js           # Poker table (players, blinds, hand state)
│   │   └── Game.js            # Game history (winner, pot, cards)
│   ├── routes/
│   │   ├── index.routes.js    # Route aggregator with auth middleware
│   │   ├── gameRoutes.routes.js
│   │   ├── tableRoutes.routes.js
│   │   └── userRoutes.routes.js
│   └── middleware/
│       └── authMiddleare.js   # JWT verification
├── logic/                     # Poker game engine
│   ├── autoDealer.js          # Main game loop (preflop → flop → turn → river)
│   ├── desicionManager.js     # Player decision handling (Promise-based)
│   ├── winner.js              # Hand evaluation & tie-breaking
│   ├── Manos.js               # Hand ranking verification
│   ├── clases.js              # Domain classes (Carta, Player, Mesa, Mano)
│   └── cartas.js              # Deck generation
└── package.json
```

## How It Works

### Real-Time Communication (Socket.IO)

El servidor mantiene conexiones WebSocket persistentes para:
- Unirse/salir de mesas
- Recibir acciones de juego en tiempo real (fold, call, raise)
- Emitir estado actualizado a todos los jugadores (cartas, apuestas, pot)
- Chat en vivo entre jugadores

### Game Flow

1. **Unirse a mesa** → El jugador se registra en una mesa y recibe sus fichas iniciales según el buy-in
2. **Auto-start** → Cuando hay 2+ jugadores, el juego inicia automáticamente
3. **Pre-Flop** → Se reparten 2 cartas a cada jugador, se establecen SB/BB, comienzan las apuestas
4. **Flop** → Se revelan 3 cartas comunitarias, nueva ronda de apuestas
5. **Turn** → Se revela la 4ta carta comunitaria
6. **River** → Se revela la 5ta carta comunitaria
7. **Showdown** → Se evalúan las manos usando algoritmo de ranking (escalera, color, full house, etc.)
8. **Nuevo juego** → Se rotan posiciones (Button → SB → BB) y repite

### API REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tables` | Listar todas las mesas |
| GET | `/api/tables/:id` | Obtener mesa por ID |
| GET | `/api/games` | Historial de juegos |
| GET | `/api/games/:id` | Detalle de un juego |
| GET | `/api/health` | Health check |

## Key Features

- **Bidirectional real-time events:** Socket.IO permite enviar acciones desde el cliente y emitir actualizaciones instantáneas a todos los jugadores
- **Authentication:** JWT en handshake de WebSocket + middleware para rutas REST
- **Multi-origin CORS:** Soporta múltiples orígenes configurables via env
- **MongoDB connection pooling:** Cache de conexión para mejor rendimiento
- **Turn timers:** Sistema de timers para forzar fold si el jugador no actúa
- **Hand evaluation:** Algoritmo completo de evaluación de manos de poker con desempates
- **Seat management:** Un usuario puede estar en múltiples mesas (mapeo userId ↔ socket)

## Environment Variables

```env
PORT=3000
MONGO_PASS=your_mongodb_password
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com
```

## Scripts

```bash
npm start        # Iniciar servidor en producción
npm run dev      # (agregar si tienes script de desarrollo)
```

## Models Overview

### User
- `name`, `lastName`, `birthDate`, `nickname`
- `stack` (fichas actuales)
- `wins`, `totalGames` (estadísticas)
- `password` (hash)

### Table
- `name`, `maxPlayers` (hasta 9)
- `minBuyIn`, `maxBuyIn`, `smallBlind`, `bigBlind`
- `players[]` (referencia a User)
- `currentHand` (orden de juego, pot, bets, cards, community)

### Game
- `table`, `players[]`, `winner`
- `pot` (pozo final)
- `cards` (cartas de cada jugador)

## Socket Events

**Client → Server:**
- `register` - Registrar userId en el socket
- `joinTable` - Unirse a una mesa
- `leaveTable` - Salir de la mesa
- `chat:send` - Enviar mensaje de chat
- `action:send` - Enviar acción de juego (fold/call/raise)

**Server → Client:**
- `players:update` - Actualización de jugadores en mesa
- `turn:active` - Indica cuyo turno es
- `cards:update` - Cartas repartidas
- `community:update` - Cartas comunitarias
- `pot:update` - Actualización del pozo
- `chips:update` - Fichas de cada jugador
- `ganador` - Anuncio de ganador
- `chat:message` - Nuevo mensaje de chat

---

Autenticación via JWT • MongoDB • Socket.IO • Deployable en Railway
Link del repositorio del Front-End: https://github.com/WilmerJr01/ProyectoPoker
