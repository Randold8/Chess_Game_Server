class GameController {
    constructor(board) {
        if (!board) {
            throw new Error('Board is required for GameController');
        }
        this.board = board;
        this.gameState = new GameState(board);
        this.networkManager = new NetworkManager(this);
        this.isDragging = false;
        this.selectedPiece = null;
        this.dragStartTile = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dragPosition = { x: 0, y: 0 };
        this.lastMove = null;
    }

    setPlayerColor(color) {
        this.gameState.playerColor = color;
        console.log(`Player color set to ${color}`);
    }
    // Добавляем метод getUIState
    getUIState() {
        const state = {
            dragState: null,
            cardState: null,
            buttonStates: null
        };

        if (this.gameState.phase === 'card-selection') {
            this.gameState.updateTileStates();
        }

        if (this.isDragging && this.selectedPiece) {
            state.dragState = {
                piece: this.selectedPiece,
                position: this.dragPosition
            };
        }

        if (this.gameState.currentCard && this.gameState.phase === 'card-selection') {
            state.cardState = this.gameState.currentCard.getState();
            state.buttonStates = state.cardState.buttons;
        }

        return state;
    }

    mousePressed(mouseX, mouseY) {
        // Добавляем проверку и логирование
        console.log('Current player:', this.gameState.currentPlayer,
            'Player color:', this.gameState.playerColor,
            'Game state:', this.gameState);

 if (this.gameState.currentPlayer !== this.gameState.playerColor) {
     console.log('Not your turn');
     return;
 }

        // Check card buttons first
        if (this.gameState.phase === 'card-selection') {
            if (this.gameState.isOverOkButton(mouseX, mouseY)) {
                this.gameState.executeCard();
                return;
            }
            if (this.gameState.isOverDeclineButton(mouseX, mouseY)) {
                this.gameState.declineCard();
                return;
            }

            const tileX = Math.floor(mouseX / tileSize);
            const tileY = Math.floor(mouseY / tileSize);
            const tile = this.board.getTileAt(tileX, tileY);
            if (tile) {
                this.gameState.handleCardSelection(tile);
                this.gameState.updateTileStates();
            }
            return;
        }

        // Normal piece movement
        if (this.gameState.phase === 'normal') {
            const tileX = Math.floor(mouseX / tileSize);
            const tileY = Math.floor(mouseY / tileSize);
            const tile = this.board.getTileAt(tileX, tileY);

            if (tile && tile.occupyingPiece &&
                tile.occupyingPiece.color === this.gameState.currentPlayer) {
                this.selectedPiece = tile.occupyingPiece;
                this.isDragging = true;
                this.dragStartTile = tile;

                this.dragOffset.x = mouseX - (tileX * tileSize);
                this.dragOffset.y = mouseY - (tileY * tileSize);

                this.dragPosition = {
                    x: mouseX - this.dragOffset.x,
                    y: mouseY - this.dragOffset.y
                };

                this.gameState.handlePieceSelection(tile);
                this.gameState.updateTileStates(false);

                tile.clear();
            }
        }
    }

    mouseDragged(mouseX, mouseY) {
        if (this.gameState.currentPlayer !== this.gameState.playerColor) {
            return;
        }
        if (!this.isDragging || this.gameState.phase !== 'normal') return;

        this.dragPosition = {
            x: mouseX - this.dragOffset.x,
            y: mouseY - this.dragOffset.y
        };
    }

    
mouseReleased(mouseX, mouseY) {
    if (this.gameState.currentPlayer !== this.gameState.playerColor) {
        return;
    }

    if (!this.isDragging || this.gameState.phase !== 'normal') return;

    const targetX = Math.floor(mouseX / tileSize);
    const targetY = Math.floor(mouseY / tileSize);
    const targetTile = this.board.getTileAt(targetX, targetY);

    if (targetTile && this.selectedPiece && targetTile !== this.dragStartTile) {
        this.lastMove = {
            piece: this.selectedPiece,
            fromTile: this.dragStartTile,
            toTile: targetTile
        };

        // Check if this is a capture move
        const captureResult = this.selectedPiece.isValidCapture(targetTile, this.board);
        if (captureResult.isValid) {
            // Handle capture locally before sending to server
            // Mark captured pieces as dead and clear their tiles
            captureResult.capturedPieces.forEach(capturedPiece => {
                if (capturedPiece && capturedPiece.currentTile) {
                    capturedPiece.state = 'dead';
                    capturedPiece.currentTile.clear();
                }
            });

            // Now move the capturing piece
            this.selectedPiece.spawn(targetTile);

            // Send move to server
            this.networkManager.sendMove(this.dragStartTile, targetTile);
        }
        else if (this.selectedPiece.isValidMove(targetTile, this.board)) {
            // Regular move
            this.selectedPiece.spawn(targetTile);
            this.networkManager.sendMove(this.dragStartTile, targetTile);
        }
        else {
            // Invalid move, return piece to original position
            this.selectedPiece.spawn(this.dragStartTile);
        }
    } else {
        // Dropped on same tile or invalid location
        if (this.selectedPiece) {
            this.selectedPiece.spawn(this.dragStartTile);
        }
    }

    // Reset all tile states
    this.board.resetTileStates();

    this.isDragging = false;
    this.selectedPiece = null;
    this.dragStartTile = null;
    this.dragPosition = { x: 0, y: 0 };
}

    revertMove() {
        if (this.lastMove) {
            if (this.lastMove.toTile.occupyingPiece) {
                this.lastMove.toTile.clear();
            }
            this.lastMove.piece.spawn(this.lastMove.fromTile);
            this.lastMove = null;
        }
    }
}



