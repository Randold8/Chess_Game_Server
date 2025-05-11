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
        this.gameOver = false;
    this.winner = null;
        // Add card state tracking
        this.cardPhase = 'normal';
        this.activeCardType = null;
        this.cardOwner = null;
    
        this.cardDrawInterval = 2;  // Draw every 2 turns
        this.playerCardCounters = {
            'white': 0,
            'black': 0
        };
    
        // Initialize Topsy-Turvy tracking
        this.topsyTurvyPawns = [];
    
        this.setupInitialPosition();
    }
    checkGameOver() {
        // Check if white king is alive
        const whiteKing = this.board.pieces.find(p => p.name === 'king' && p.color === 'white' && p.state === 'alive');
    
        // Check if black king is alive
        const blackKing = this.board.pieces.find(p => p.name === 'king' && p.color === 'black' && p.state === 'alive');
    
        if (!whiteKing) {
            this.gameOver = true;
            this.winner = 'black';
            console.log('Game over! Black wins by capturing white king');
            return true;
        }
    
        if (!blackKing) {
            this.gameOver = true;
            this.winner = 'white';
            console.log('Game over! White wins by capturing black king');
            return true;
        }
    
        return false;
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
        // Get available cards that haven't been drawn this cycle
        const availableCardTypes = [1, 2, 3, 4, 5, 6]; // Default card IDs
    
        // Filter out disabled cards (add any card IDs you want to disable)
        const disabledCardIds = [6]; // e.g., [6] would disable Topsy Turvy (card #6)
    
        // Filter out already drawn cards
        const drawnCardIds = this.drawnCardIds || [];
    
        // Get cards that are available and not drawn this cycle
        let eligibleCardIds = availableCardTypes
            .filter(id => !disabledCardIds.includes(id))
            .filter(id => !drawnCardIds.includes(id));
    
        // If all cards have been drawn, reset the cycle
        if (eligibleCardIds.length === 0) {
            console.log("All cards have been drawn this cycle, resetting tracking");
            this.drawnCardIds = [];
            eligibleCardIds = availableCardTypes.filter(id => !disabledCardIds.includes(id));
        }
    
        // Select a random card from eligible ones
        const randomIndex = Math.floor(Math.random() * eligibleCardIds.length);
        const cardTypeId = eligibleCardIds[randomIndex];
    
        // Record that this card has been drawn
        if (!this.drawnCardIds) this.drawnCardIds = [];
        this.drawnCardIds.push(cardTypeId);
    
        // Set card phase
        this.cardPhase = 'card-selection';
        this.activeCardType = cardTypeId;
        this.cardOwner = this.currentPlayer;
    
        console.log(`Player ${this.currentPlayer} drew card type ${cardTypeId}`);
        console.log(`Drawn cards this cycle: ${this.drawnCardIds.join(', ')}`);
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
            cardOwner: this.cardOwner,
            topsyTurvyPawns: this.topsyTurvyPawns || [],
            gameOver: this.gameOver,
            winner: this.winner
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
    
        // Check if this pawn has the Topsy-Turvy effect
        const isTopsyTurvyPawn = piece.name === 'pawn' &&
                                this.topsyTurvyPawns &&
                                this.topsyTurvyPawns.includes(sourceTileId);
    
        // For Topsy-Turvy pawns, use special validation logic
        if (isTopsyTurvyPawn) {
            console.log('Validating Topsy-Turvy pawn move');
            const direction = piece.color === 'white' ? -1 : 1;
    
            // ===== MOVE VALIDATION =====
            // For moves, the target must be empty
            if (!targetTile.occupyingPiece) {
                // Diagonal movement (1 square)
                const isDiagonal = Math.abs(targetX - sourceX) === 1 &&
                                targetY === sourceY + direction;
    
                if (isDiagonal) {
                    console.log('Valid Topsy-Turvy diagonal move');
                    return true;
                }
    
                // Double diagonal move (if first move)
                if (!piece.hasMoved) {
                    const isDiagonal2 = Math.abs(targetX - sourceX) === 2 &&
                                    targetY === sourceY + (2 * direction);
    
                    if (isDiagonal2) {
                        // Check intermediate square is clear
                        const midX = Math.floor((sourceX + targetX) / 2);
                        const midY = sourceY + direction;
                        const midTile = this.board.getTileAt(midX, midY);
    
                        if (midTile && !midTile.occupyingPiece) {
                            console.log('Valid Topsy-Turvy double diagonal move');
                            return true;
                        }
                    }
                }
            }
            // ===== CAPTURE VALIDATION =====
            // For captures, target must contain enemy piece
            else if (targetTile.occupyingPiece &&
                    targetTile.occupyingPiece.color !== piece.color) {
    
                // Forward capture (straight ahead)
                const isForward = targetX === sourceX &&
                                targetY === sourceY + direction;
    
                if (isForward) {
                    console.log('Valid Topsy-Turvy forward capture');
                    return true;
                }
            }
    
            console.log('Invalid Topsy-Turvy move');
            return false;
        }
    
        // Normal validation for regular pieces
        // First check for captures
        const captureResult = piece.isValidCapture(targetTile, this.board);
        if (captureResult.isValid) {
            console.log('Valid capture move');
            return true;
        }
    
        // Then check for normal moves
        if (piece.isValidMove(targetTile, this.board)) {
            console.log('Valid normal move');
            return true;
        }
    
        console.log('Invalid move');
        return false;
    }
    validateTopsyTurvyMove(piece, sourceTile, targetTile) {
        const direction = piece.color === 'white' ? -1 : 1;
    
        // MOVE: Diagonal movement (1 or 2 squares if first move)
        if (!targetTile.occupyingPiece) {
            // Single diagonal move
            const isDiagonal = Math.abs(targetTile.x - sourceTile.x) === 1 &&
                            targetTile.y === sourceTile.y + direction;
            if (isDiagonal) {
                console.log('Valid Topsy-Turvy diagonal move');
                return true;
            }
    
            // Double diagonal move (first move only)
            const isDiagonal2 = !piece.hasMoved &&
                        Math.abs(targetTile.x - sourceTile.x) === 2 &&
                        targetTile.y === sourceTile.y + (2 * direction);
            if (isDiagonal2) {
                // Check the path is clear
                const midX = (sourceTile.x + targetTile.x) / 2;
                const midY = sourceTile.y + direction;
                const midTile = this.board.getTileAt(midX, midY);
                if (midTile && !midTile.occupyingPiece) {
                    console.log('Valid Topsy-Turvy double diagonal move');
                    return true;
                }
            }
        }
    
        // CAPTURE: Forward capture
        if (targetTile.occupyingPiece && targetTile.occupyingPiece.color !== piece.color) {
            const isForward = targetTile.x === sourceTile.x &&
                            targetTile.y === sourceTile.y + direction;
            if (isForward) {
                console.log('Valid Topsy-Turvy forward capture');
                return true;
            }
        }
    
        console.log('Invalid Topsy-Turvy move');
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

    if (this.gameOver) {
        console.log("Game is already over, ignoring move");
        return {
            status: 0x01,
            changes: [],
            gameOver: this.gameOver,
            winner: this.winner
        };
    }

    switch(actionType) {
        case 0x01: // Piece Movement
            this.executePieceMove(data, changes);
            break;
        case 0x02: // Card Action
            cardActionExecuted = this.executeCardAction(data, changes);
            break;
        case 0x05: // Decline Card
            this.declineCard();
            cardActionExecuted = true;
            break;
    }

    // Check for game over after move execution
    this.checkGameOver();

    // After executing the action
    console.log(`Action executed, changes: ${changes.length}, cardAction=${actionType === 0x02}, success=${cardActionExecuted}`);

    // Update turn number and player UNLESS it's a card action that failed or game is over
    if (!this.gameOver && (actionType !== 0x02 || cardActionExecuted)) {
        this.turnNumber++;
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        console.log(`Turn changed to: ${this.currentPlayer}`);

        // Check for card draw if turn changed
        if (this.checkCardDraw()) {
            console.log(`Player ${this.currentPlayer} drew a card`);
        }
    } else if (this.gameOver) {
        console.log(`Game over! ${this.winner} wins!`);
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
        cardOwner: this.cardOwner,
        topsyTurvyPawns: this.topsyTurvyPawns || [],
        gameOver: this.gameOver,
        winner: this.winner
    };

    console.log(`Response prepared, currentPlayer: ${response.currentPlayer}, changes: ${response.changes.length}, gameOver: ${response.gameOver}`);
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
            // Check if this was a Topsy-Turvy pawn
            const isTopsyTurvyPawn = movingPiece.name === 'pawn' &&
                                    this.topsyTurvyPawns &&
                                    this.topsyTurvyPawns.includes(sourceTileId);
    
            // Special handling for jumper captures
            let capturedByJumper = null;
            if (movingPiece.name === 'jumper' && !capturedPiece) {
                const dx = targetX - sourceX;
                const dy = targetY - sourceY;
    
                // Check if it's a diagonal jump of distance 2
                if (Math.abs(dx) === 2 && Math.abs(dy) === 2) {
                    // Calculate the position of the piece being jumped over
                    const midX = sourceX + dx/2;
                    const midY = sourceY + dy/2;
    
                    // Check the piece being jumped over
                    const jumpedTile = this.board.getTileAt(midX, midY);
                    if (jumpedTile && jumpedTile.occupyingPiece &&
                        jumpedTile.occupyingPiece.color !== movingPiece.color) {
    
                        capturedByJumper = jumpedTile.occupyingPiece;
                        const jumpedTileId = midY * 8 + midX;
    
                        // Mark the jumped piece as captured
                        capturedByJumper.state = 'dead';
                        jumpedTile.clear();
                        changes.push({
                            tileId: jumpedTileId,
                            actionType: 0x01, // Remove Piece
                            reason: 0x04  // Capture
                        });
    
                        console.log('Jumper captured piece at:', {x: midX, y: midY});
                    }
                }
            }
    
            // 1. If there's a piece on the target tile, mark it as captured
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
    
            // 2. Clear the source tile
            sourceTile.clear();
            changes.push({
                tileId: sourceTileId,
                actionType: 0x01, // Remove Piece
                reason: 0x03 // Normal Movement
            });
    
            // 3. Move the piece to the new tile
            movingPiece.spawn(targetTile);
            movingPiece.hasMoved = true; // Always set hasMoved when a piece moves
    
            changes.push({
                tileId: targetTileId,
                actionType: 0x02, // Add Piece
                parameter: this.getPieceParameter(movingPiece),
                reason: (capturedPiece || capturedByJumper) ? 0x04 : 0x03 // Capture or Normal Movement
            });
    
            // 4. Update the Topsy-Turvy tracking if this was a Topsy-Turvy pawn
            if (isTopsyTurvyPawn) {
                console.log(`Updating Topsy-Turvy pawn tracking: ${sourceTileId} -> ${targetTileId}`);
    
                // Remove old tile ID and add new one
                const index = this.topsyTurvyPawns.indexOf(sourceTileId);
                if (index !== -1) {
                    this.topsyTurvyPawns[index] = targetTileId;
                }
            }
    
            // 5. Update piece state
            if (movingPiece.name === 'pawn' && Math.abs(targetY - sourceY) === 2) {
                movingPiece.hasDoubleMoved = true;
            }
    
            console.log('Move executed successfully');
        } catch (error) {
            console.error('Error executing move:', error);
            // Restore original state in case of error
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
    
            // For Topsy Turvy (card type 6), store the affected pawns
            if (cardType === 0x06) {
                // Store the selected pawns in a property for later inclusion in state
                this.topsyTurvyPawns = selections.slice();
                console.log(`Stored ${this.topsyTurvyPawns.length} Topsy-Turvy pawn locations`);
            }
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
    
        if (!room) {
            socket.emit("moveResponse", {status: 0x00}); // Invalid move
            return;
        }
    
        // If the game is over, return game over response
        if (room.gameOver) {
            socket.emit("moveResponse", {
                status: 0x01,
                gameOver: room.gameOver,
                winner: room.winner,
                message: `Game over! ${room.winner.charAt(0).toUpperCase() + room.winner.slice(1)} wins!`
            });
            return;
        }
    
        if (room.players.get(socket.id).color !== room.currentPlayer) {
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
            console.log(`Response changes: ${response.changes.length}, current player: ${response.currentPlayer}, gameOver: ${response.gameOver}`);
    
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