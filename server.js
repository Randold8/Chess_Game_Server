const express = require("express");
const app = express();
const server = app.listen(3000);
const socket = require("socket.io");
const io = socket(server);
const path = require('path');

const Utils = require('./shared/utils');
const { Board, Tile, Piece } = require('./shared/gameClasses');
const { PieceLogic } = require('./shared/pieceLogic');

// Проверяем, что все необходимые компоненты загружены
console.log('Loaded components:', {
    Board: !!Board,
    Tile: !!Tile,
    Piece: !!Piece,
    PieceLogic: !!PieceLogic,
    'PieceLogic.pawn': !!PieceLogic.pawn
});

app.use(express.static('public'));
app.use('/shared', express.static('shared'));

// Маршрут для корневого URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Добавляем обработку ошибок
app.use((req, res) => {
    res.status(404).send('404: Page not found');
});

class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = new Map();

        // Создаем доску
        try {
            this.board = new Board();
            console.log('Board created successfully');
        } catch (e) {
            console.error('Error creating board:', e);
        }

        this.turnNumber = 0;
        this.currentPlayer = 'white';
        this.setupInitialPosition();
    }

    setupInitialPosition() {
        const pieces = [
            // Black pieces
            { name: 'rook', color: 'black', x: 0, y: 0 },
            { name: 'knight', color: 'black', x: 1, y: 0 },
            { name: 'bishop', color: 'black', x: 2, y: 0 },
            { name: 'queen', color: 'black', x: 3, y: 0 },
            { name: 'king', color: 'black', x: 4, y: 0 },
            { name: 'bishop', color: 'black', x: 5, y: 0 },
            { name: 'knight', color: 'black', x: 6, y: 0 },
            { name: 'rook', color: 'black', x: 7, y: 0 },
            // Black pawns
            ...Array(8).fill().map((_, i) => ({ name: 'pawn', color: 'black', x: i, y: 1 })),
            // White pieces
            { name: 'rook', color: 'white', x: 0, y: 7 },
            { name: 'knight', color: 'white', x: 1, y: 7 },
            { name: 'bishop', color: 'white', x: 2, y: 7 },
            { name: 'queen', color: 'white', x: 3, y: 7 },
            { name: 'king', color: 'white', x: 4, y: 7 },
            { name: 'bishop', color: 'white', x: 5, y: 7 },
            { name: 'knight', color: 'white', x: 6, y: 7 },
            { name: 'rook', color: 'white', x: 7, y: 7 },
            // White pawns
            ...Array(8).fill().map((_, i) => ({ name: 'pawn', color: 'white', x: i, y: 6 })),
            // Special pieces
            { name: 'ogre', color: 'white', x: 5, y: 5 },
            { name: 'jumper', color: 'black', x: 2, y: 2 }
        ];
        pieces.forEach(pieceData => {
            const piece = Piece.createPiece(pieceData.name, pieceData.color);
            const tile = this.board.getTileAt(pieceData.x, pieceData.y);
            if (tile) {
                piece.spawn(tile);
                this.board.addPiece(piece);
            }
        });

        this.initialPieces = pieces;
    }

    getFullState() {
        const changes = [];
        this.board.tiles.forEach((tile, index) => {
            if (tile.occupyingPiece) {
                changes.push({
                    tileId: index,
                    actionType: 0x02, // Add Piece
                    parameter: this.getPieceParameter(tile.occupyingPiece),
                    reason: 0x01 // Turn Start
                });
            }
        });

        return {
            status: 0x01,
            changes: changes,
            turnNumber: this.turnNumber,
            currentPlayer: this.currentPlayer  // Добавляем текущего игрока
        };
    }

    getPieceParameter(piece) {
        const pieceTypes = {
            'pawn': 0x01,
            'rook': 0x02,
            'knight': 0x03,
            'bishop': 0x04,
            'queen': 0x05,
            'king': 0x06,
            'jumper': 0x07,
            'ogre': 0x08
        };
        return piece.color === 'white' ?
            pieceTypes[piece.name] :
            pieceTypes[piece.name] + 0x10;
    }

    addPlayer(socketId, color) {
        this.players.set(socketId, { color: color });
    }

    isFull() {
        return this.players.size >= 2;
    }
    validateMove(data) {
        const actionType = data[0];
        console.log('Validating move:', data);

        switch(actionType) {
            case 0x01: // Piece Movement
                return this.validatePieceMove(data);
            case 0x02: // Card Action
                return this.validateCardAction(data);
            case 0x03: // Concede
                return true;
            case 0x04: // Request Resync
                return true;
            default:
                console.log('Unknown action type:', actionType);
                return false;
        }
    }

    validatePieceMove(data) {
        const sourceTileId = data[1];
        const targetTileId = data[2];

        const sourceX = sourceTileId % 8;
        const sourceY = Math.floor(sourceTileId / 8);
        const targetX = targetTileId % 8;
        const targetY = Math.floor(targetTileId / 8);

        console.log('Validating move:', {
            from: {x: sourceX, y: sourceY},
            to: {x: targetX, y: targetY}
        });

        const sourceTile = this.board.getTileAt(sourceX, sourceY);
        const targetTile = this.board.getTileAt(targetX, targetY);

        if (!sourceTile || !targetTile) {
            console.log('Invalid tile coordinates');
            return false;
        }

        const piece = sourceTile.occupyingPiece;
        if (!piece) {
            console.log('No piece at source tile');
            return false;
        }

        if (piece.color !== this.currentPlayer) {
            console.log('Not this player\'s turn');
            return false;
        }

        // Сначала проверяем возможность взятия
        const captureResult = piece.isValidCapture(targetTile, this.board);
        if (captureResult.isValid) {
            console.log('Valid capture move');
            return true;
        }

        // Затем проверяем возможность обычного хода
        if (piece.isValidMove(targetTile, this.board)) {
            console.log('Valid normal move');
            return true;
        }

        console.log('Invalid move');
        return false;
    }
    validateCardAction(data) {
        // Здесь будет валидация действий карт
        // Пока что возвращаем false
        return false;
    }

    executeMove(data) {
        console.log('Executing move:', data);
        const changes = [];
        const actionType = data[0];

        switch(actionType) {
            case 0x01: // Piece Movement
                this.executePieceMove(data, changes);
                break;
            case 0x02: // Card Action
                this.executeCardAction(data, changes);
                break;
        }

        // Увеличиваем номер хода и меняем текущего игрока
        this.turnNumber++;
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        console.log('Turn changed to:', this.currentPlayer);

        return {
            status: 0x01,
            changes: changes,
            turnNumber: this.turnNumber,
            currentPlayer: this.currentPlayer  // Добавляем информацию о текущем игроке
        };
    }

    executePieceMove(data, changes) {
        const sourceTileId = data[1];
        const targetTileId = data[2];

        const sourceX = sourceTileId % 8;
        const sourceY = Math.floor(sourceTileId / 8);
        const targetX = targetTileId % 8;
        const targetY = Math.floor(targetTileId / 8);

        console.log('Moving piece from', {x: sourceX, y: sourceY}, 'to', {x: targetX, y: targetY});

        const sourceTile = this.board.getTileAt(sourceX, sourceY);
        const targetTile = this.board.getTileAt(targetX, targetY);
        const movingPiece = sourceTile.occupyingPiece;
        const capturedPiece = targetTile.occupyingPiece;

        try {
            // 1. Если есть фигура на целевой клетке, помечаем её как взятую
            if (capturedPiece) {
                console.log('Capturing piece:', capturedPiece.name, capturedPiece.color);
                capturedPiece.state = 'dead';
                targetTile.clear();
                changes.push({
                    tileId: targetTileId,
                    actionType: 0x01, // Remove Piece
                    reason: 0x04 // Capture
                });
            }

            // 2. Очищаем исходную клетку
            sourceTile.clear();
            changes.push({
                tileId: sourceTileId,
                actionType: 0x01, // Remove Piece
                reason: 0x03 // Normal Movement
            });

            // 3. Перемещаем фигуру на новую клетку
            movingPiece.spawn(targetTile);
            changes.push({
                tileId: targetTileId,
                actionType: 0x02, // Add Piece
                parameter: this.getPieceParameter(movingPiece),
                reason: capturedPiece ? 0x04 : 0x03 // Capture или Normal Movement
            });

            // 4. Обновляем состояние фигуры
            movingPiece.hasMoved = true;
            if (movingPiece.name === 'pawn' && Math.abs(targetY - sourceY) === 2) {
                movingPiece.hasDoubleMoved = true;
            }

            console.log('Move executed successfully');
        } catch (error) {
            console.error('Error executing move:', error);
            // Восстанавливаем исходное состояние в случае ошибки
            if (capturedPiece) {
                targetTile.occupy(capturedPiece);
                capturedPiece.state = 'alive';
            }
            sourceTile.occupy(movingPiece);
            throw error;
        }
    }

    executeCardAction(data, changes) {
        // Реализация выполнения действий карт
        console.log('Card action not implemented yet');
    }

}

let waitingRoom = null;
const rooms = new Map();

io.sockets.on("connection", (socket) => {
    console.log("New connection:", socket.id);

    if (!waitingRoom) {
        try {
            waitingRoom = new GameRoom(socket.id);
            waitingRoom.addPlayer(socket.id, 'white');
            socket.join(waitingRoom.id);
            socket.emit("connected", {
                color: 'white',
                roomId: waitingRoom.id
            });
            console.log('Created new room, white player connected');
        } catch (e) {
            console.error('Error creating waiting room:', e);
        }
    } else {
        waitingRoom.addPlayer(socket.id, 'black');
        socket.join(waitingRoom.id);
        socket.emit("connected", {
            color: 'black',
            roomId: waitingRoom.id
        });

        const room = waitingRoom;
        rooms.set(room.id, room);

        const initialState = room.getFullState();
        console.log('Starting game with state:', initialState);
        io.to(room.id).emit("gameStart", initialState);

        waitingRoom = null;
    }

    socket.on("move", (data) => {
        const room = Array.from(rooms.values())
            .find(r => r.players.has(socket.id));

        if (!room || room.players.get(socket.id).color !== room.currentPlayer) {
            socket.emit("moveResponse", {status: 0x00}); // Invalid move
            return;
        }

        if (room.validateMove(data)) {
            const response = room.executeMove(data);
            io.to(room.id).emit("moveResponse", response);
        } else {
            socket.emit("moveResponse", {status: 0x00}); // Invalid move
        }
    });

    socket.on("requestSync", () => {
        const room = Array.from(rooms.values())
            .find(r => r.players.has(socket.id));
        if (room) {
            socket.emit("syncResponse", room.getFullState());
        }
    });
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});