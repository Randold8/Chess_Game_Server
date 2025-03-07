class NetworkManager {
    constructor(gameController) {
        this.socket = io.connect("http://localhost:3000");
        this.gameController = gameController;
        this.color = null;
        this.roomId = null;
        this.lastSyncTurn = 0;
        this.pendingState = null; // Добавляем хранение отложенного состояния

        // Ждем готовности реестра фигур перед установкой обработчиков сокета
        window.Piece.onReady(() => {
            this.setupSocketHandlers();
        });
    }

    setupSocketHandlers() {
        this.socket.on("connected", (data) => {
            this.color = data.color;
            this.roomId = data.roomId;
            this.gameController.setPlayerColor(this.color);
            console.log(`Connected as ${this.color} in room ${this.roomId}`);
        });

        this.socket.on("gameStart", (state) => {
            console.log("Game started, receiving initial state:", state);
            if (window.PieceRegistry.ready) {
                this.applyServerState(state);
            } else {
                console.log("Piece registry not ready, storing state");
                this.pendingState = state;
                window.Piece.onReady(() => {
                    if (this.pendingState) {
                        console.log("Applying pending state");
                        this.applyServerState(this.pendingState);
                        this.pendingState = null;
                    }
                });
            }
        });

        this.socket.on("moveResponse", (response) => {
            if (response.status === 0x01) {
                this.applyServerState(response);
            } else {
                this.gameController.revertMove();
            }
        });
    }


    sendMove(sourceTile, targetTile, promotion = 0x00) {
        const moveData = new Uint8Array([
            0x01, // Move action
            this.tileToId(sourceTile),
            this.tileToId(targetTile),
            promotion
        ]);
        this.socket.emit("move", moveData);
    }

    sendCardAction(selections) {
        const data = new Uint8Array(2 + selections.length);
        data[0] = 0x02; // Card action
        data[1] = selections.length;
        selections.forEach((tile, index) => {
            data[index + 2] = this.tileToId(tile);
        });
        this.socket.emit("move", data);
    }

    checkSync() {
        if (this.gameController.gameState.turnNumber !== this.lastSyncTurn) {
            this.requestSync();
        }
    }

    requestSync() {
        this.socket.emit("requestSync");
    }

    tileToId(tile) {
        return tile.y * 8 + tile.x;
    }

    idToTileCoords(id) {
        return {
            x: id % 8,
            y: Math.floor(id / 8)
        };
    }

    applyServerState(state) {
        console.log("Applying server state:", state);
        this.lastSyncTurn = state.turnNumber;

        // Применяем изменения в правильном порядке
        const removeChanges = state.changes.filter(change => change.actionType === 0x01);
        const addChanges = state.changes.filter(change => change.actionType === 0x02);

        // Сначала выполняем все удаления
        removeChanges.forEach(change => {
            const coords = this.idToTileCoords(change.tileId);
            console.log('Removing piece at:', coords);
            const tile = this.gameController.board.getTileAt(coords.x, coords.y);

            if (!tile) {
                console.error("Invalid tile coordinates:", coords);
                return;
            }

            if (tile.occupyingPiece) {
                console.log('Removing piece:', tile.occupyingPiece.name, tile.occupyingPiece.color);
                tile.occupyingPiece.state = 'dead';
                tile.clear();
            }
        });

        // Затем выполняем все добавления
        addChanges.forEach(change => {
            const coords = this.idToTileCoords(change.tileId);
            console.log('Adding piece at:', coords);
            const tile = this.gameController.board.getTileAt(coords.x, coords.y);

            if (!tile) {
                console.error("Invalid tile coordinates:", coords);
                return;
            }

            // На всякий случай очищаем клетку перед добавлением новой фигуры
            if (tile.occupyingPiece) {
                tile.occupyingPiece.state = 'dead';
                tile.clear();
            }

            const newPiece = this.createPieceFromParameter(change.parameter);
            if (newPiece) {
                console.log('Adding new piece:', newPiece.name, newPiece.color);
                newPiece.spawn(tile);
                this.gameController.board.addPiece(newPiece);
            }
        });

        // Обновляем состояние игры
        this.gameController.gameState.turnNumber = state.turnNumber;
        this.gameController.gameState.currentPlayer = state.currentPlayer;
        console.log("State applied, current player:", this.gameController.gameState.currentPlayer);
        // Обновляем кладбища
        if (this.gameController.whiteGraveyard) {
            this.gameController.whiteGraveyard.updateDeadPieces(this.gameController.board);
        }
        if (this.gameController.blackGraveyard) {
            this.gameController.blackGraveyard.updateDeadPieces(this.gameController.board);
        }

        console.log("State applied, current player:", this.gameController.gameState.currentPlayer);
    }

    createPieceFromParameter(param) {
        try {
            const color = param < 0x10 ? 'white' : 'black';
            const typeParam = param & 0x0F;
            const pieceTypes = {
                0x01: 'pawn',
                0x02: 'rook',
                0x03: 'knight',
                0x04: 'bishop',
                0x05: 'queen',
                0x06: 'king',
                0x07: 'jumper',
                0x08: 'ogre'
            };

            const pieceName = pieceTypes[typeParam];
            if (!pieceName) {
                console.error('Unknown piece type parameter:', typeParam);
                return null;
            }

            console.log('Creating piece:', pieceName, color);
            return window.Piece.createPiece(pieceName, color);
        } catch (e) {
            console.error('Error creating piece:', e);
            return null;
        }
    }
}
    