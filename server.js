const express = require("express");
const app = express();
const server = app.listen(3000);
const socket = require("socket.io");
const io = socket(server);
const path = require('path');

const Utils = require('./shared/utils');
const { Board, Tile, Piece } = require('./shared/gameClasses');
const { PieceLogic } = require('./shared/pieceLogic');
const CardEffect = require('./cardEffects');

// Add a check to verify it's loaded:
console.log("CardEffect loaded:", !!CardEffect, "Methods:", Object.keys(CardEffect).join(", "));

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
        this.board = new Board();
        this.turnNumber = 0;
        this.currentPlayer = 'white';

        // Add card state tracking
        this.cardPhase = 'normal';  // 'normal' or 'card-selection'
        this.activeCardType = null; // Card type ID when in card-selection phase
        this.cardOwner = null;      // Which player has an active card

        this.cardDrawInterval = 2;  // Draw every 2 turns
        this.playerCardCounters = {
            'white': 0,
            'black': 0
        };

        this.setupInitialPosition();
    }
    checkCardDraw() {
        console.log(`Checking for card draw: player=${this.currentPlayer}, counter=${this.playerCardCounters[this.currentPlayer]}, interval=${this.cardDrawInterval}`);
    
        const counter = this.playerCardCounters[this.currentPlayer];
        if (counter >= this.cardDrawInterval) {
            // Reset counter
            this.playerCardCounters[this.currentPlayer] = 0;
    
            // Draw card
            this.drawCard();
            return true;
        } else {
            // Increment counter
            this.playerCardCounters[this.currentPlayer]++;
            return false;
        }
    }
    drawCard() {
        // Select a random card type (1-6 for our defined cards)
        const cardTypeId = Math.floor(Math.random() * 6) + 1;

        // Set card phase
        this.cardPhase = 'card-selection';
        this.activeCardType = cardTypeId;
        this.cardOwner = this.currentPlayer;

        console.log(`Player ${this.currentPlayer} drew card type ${cardTypeId}`);
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
            currentPlayer: this.currentPlayer,
            cardPhase: this.cardPhase,
            activeCardType: this.activeCardType,
            cardOwner: this.cardOwner
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
            case 0x05: // Decline Card - ADD THIS CASE
                return true;  // Always valid to decline a card
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
        const selectionsCount = data[1];
        const cardType = data[2];
    
        console.log(`Validating card action: type=${cardType}, selections=${selectionsCount}, phase=${this.cardPhase}, owner=${this.cardOwner}`);
    
        // Check if we're in card selection phase and the card type matches
        if (this.cardPhase !== 'card-selection' ||
            this.cardOwner !== this.currentPlayer ||
            (this.activeCardType !== null && this.activeCardType !== cardType)) {
            console.log(`Card validation failed: phase=${this.cardPhase}, owner=${this.cardOwner}, activeType=${this.activeCardType}`);
            return false;
        }
    
        // Parse selections
    const selections = [];
    for (let i = 0; i < selectionsCount; i++) {
        selections.push(data[i + 3]); // Using i+3 for correct offset
    }

    // Try the card effect with a *dry run* (on clone)
    const dummyChanges = [];
    const clonedBoard = this.board.clone();
    const isValid = CardEffect.executeEffect(cardType, selections, clonedBoard, this.currentPlayer, dummyChanges);

    console.log(`Card validation result: ${isValid}`);
    return isValid;
}

    executeMove(data) {
        console.log(`Executing move, current player before: ${this.currentPlayer}`);
    const changes = [];
    const actionType = data[0];

    let cardActionExecuted = false;

    switch(actionType) {
        case 0x01: // Piece Movement
            this.executePieceMove(data, changes);
            break;
        case 0x02: // Card Action
            cardActionExecuted = this.executeCardAction(data, changes);
            break;
        case 0x05: // Decline Card - ADD THIS CASE
            this.declineCard();
            cardActionExecuted = true; // Count as "executed" so we change turns
            break;
    }
    
        // After executing the action
        console.log(`Action executed, changes: ${changes.length}, cardAction=${actionType === 0x02}, success=${cardActionExecuted}`);
    
        // Update turn number and player UNLESS it's a card action that failed
        if (actionType !== 0x02 || cardActionExecuted) {
            this.turnNumber++;
            this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
            console.log(`Turn changed to: ${this.currentPlayer}`);
    
            // Check for card draw if turn changed
            if (this.checkCardDraw()) {
                console.log(`Player ${this.currentPlayer} drew a card`);
            }
        } else {
            console.log("Card action failed, turn remains with:", this.currentPlayer);
        }
    
        const response = {
            status: 0x01,
            changes: changes,
            turnNumber: this.turnNumber,
            currentPlayer: this.currentPlayer,
            cardPhase: this.cardPhase,
            activeCardType: this.activeCardType,
            cardOwner: this.cardOwner
        };
    
        console.log(`Response prepared, currentPlayer: ${response.currentPlayer}, changes: ${response.changes.length}`);
        return response;
    }
    declineCard() {
        console.log(`Player ${this.currentPlayer} declined their card`);
        this.cardPhase = 'normal';
        this.activeCardType = null;
        this.cardOwner = null;
    }
    executeCardEffect(selections, changes) {
        // We'll implement specific card effects here based on the selections
        // For now, let's implement a simple example: moving a piece from the first selection to the second
    
        if (selections.length >= 2) {
            const sourceTileId = selections[0];
            const targetTileId = selections[1];
    
            const sourceCoords = this.idToTileCoords(sourceTileId);
            const targetCoords = this.idToTileCoords(targetTileId);
    
            const sourceTile = this.board.getTileAt(sourceCoords.x, sourceCoords.y);
            const targetTile = this.board.getTileAt(targetCoords.x, targetCoords.y);
    
            if (!sourceTile || !targetTile) {
                console.error("Invalid tile coordinates for card effect");
                return;
            }
    
            const movingPiece = sourceTile.occupyingPiece;
    
            if (!movingPiece) {
                console.error("No piece at source tile for card effect");
                return;
            }
    
            // If target tile has a piece, remove it
            if (targetTile.occupyingPiece) {
                targetTile.occupyingPiece.state = 'dead';
                targetTile.clear();
                changes.push({
                    tileId: targetTileId,
                    actionType: 0x01, // Remove Piece
                    reason: 0x05 // Card Effect
                });
            }
    
            // Remove piece from source tile
            sourceTile.clear();
            changes.push({
                tileId: sourceTileId,
                actionType: 0x01, // Remove Piece
                reason: 0x05 // Card Effect
            });
    
            // Add piece to target tile
            movingPiece.spawn(targetTile);
            changes.push({
                tileId: targetTileId,
                actionType: 0x02, // Add Piece
                parameter: this.getPieceParameter(movingPiece),
                reason: 0x05 // Card Effect
            });
        }
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
    movingPiece.hasMoved = true; // Always set hasMoved when a piece moves

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
        const selectionsCount = data[1];
        const cardType = data[2];
        const selections = [];
    
        console.log(`Card action received: type=${cardType}, selections=${selectionsCount}`);
    
        // Parse tile selections
        for (let i = 0; i < selectionsCount; i++) {
            selections.push(data[i + 3]); // Note: using i+3 for correct offset
        }
    
        console.log(`Parsed selections: ${selections.join(',')}`);
    
        // Execute card effect
        const success = CardEffect.executeEffect(cardType, selections, this.board, this.currentPlayer, changes);
    
        console.log(`Card effect execution ${success ? 'succeeded' : 'failed'}, changes: ${changes.length}`);
    
        // Reset card state if successful
        if (success) {
            this.cardPhase = 'normal';
            this.activeCardType = null;
            this.cardOwner = null;
        }
    
        return success;
    }
    idToTileCoords(id) {
        return {
            x: id % 8,
            y: Math.floor(id / 8)
        };
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
    
        const actionType = data[0];
        const playerColor = room.players.get(socket.id).color;
    
        console.log(`Received ${actionType === 0x01 ? 'move' : 'card action'} from ${playerColor}`);
        console.log(`Raw data: [${Array.from(data).join(', ')}]`);
    
        if (room.validateMove(data)) {
            const response = room.executeMove(data);
    
            console.log(`Response ready, broadcasting to room ${room.id}, players: ${room.players.size}`);
            console.log(`Response changes: ${response.changes.length}, current player: ${response.currentPlayer}`);
    
            // Broadcast to ALL players in the room
            io.to(room.id).emit("moveResponse", response);
            console.log(`Broadcast complete`);
        } else {
            console.log("Move validation failed");
            socket.emit("moveResponse", {status: 0x00}); // Invalid move
        }
    });
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});