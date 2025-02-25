// controls.js
class GameController {
    constructor(board) {
        this.board = board;
        this.gameState = new GameState(board);
        this.isDragging = false;
        this.selectedPiece = null;
        this.dragStartTile = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dragPosition = { x: 0, y: 0 };

        // Start first turn
        this.gameState.startTurn();
    }

    mousePressed(mouseX, mouseY) {
        // Check card buttons first
        if (this.gameState.currentPlayer != this.gameState.playerColor){
            return;
        }
        if (this.gameState.phase === 'card-selection') {
            if (this.gameState.isOverOkButton(mouseX, mouseY)) {
                this.gameState.executeCard();
                return;
            }
            if (this.gameState.isOverDeclineButton(mouseX, mouseY)) {
                this.gameState.declineCard();
                return;
            }

            // Handle piece selection for card
            const tileX = Math.floor(mouseX / tileSize);
            const tileY = Math.floor(mouseY / tileSize);
            const tile = this.board.getTileAt(tileX, tileY);
            if (tile) {
                this.gameState.handleCardSelection(tile);
                this.gameState.updateTileStates(); // Add this line
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

                // Calculate offset within the tile for smooth dragging
                this.dragOffset.x = mouseX - (tileX * tileSize);
                this.dragOffset.y = mouseY - (tileY * tileSize);

                // Initialize drag position
                this.dragPosition = {
                    x: mouseX - this.dragOffset.x,
                    y: mouseY - this.dragOffset.y
                };
                
                this.gameState.handlePieceSelection(tile);
                this.gameState.updateTileStates(false); // Add this line

                // Clear the piece from its current tile while dragging
                tile.clear();


            }
        }
    }

    mouseDragged(mouseX, mouseY) {
        if (this.gameState.currentPlayer != this.gameState.playerColor){
            return;
        }
        if (!this.isDragging || this.gameState.phase !== 'normal') return;

        this.dragPosition = {
            x: mouseX - this.dragOffset.x,
            y: mouseY - this.dragOffset.y
        };
    }

    mouseReleased(mouseX, mouseY) {
        if (this.gameState.currentPlayer != this.gameState.playerColor){
            return;
        }
        this.gameState.updateTileStates(true);

        if (!this.isDragging || this.gameState.phase !== 'normal') return;

        const targetX = Math.floor(mouseX / tileSize);
        const targetY = Math.floor(mouseY / tileSize);
        const targetTile = this.board.getTileAt(targetX, targetY);

        let moveSuccessful = false;

        if (targetTile && this.selectedPiece && targetTile != this.dragStartTile) {
            console.log(targetTile,this.dragStartTile)
            // Check for valid captures first
            const captureResult = this.selectedPiece.isValidCapture(targetTile, this.board);
            const captureAltResult = this.selectedPiece.isValidAltCapture(targetTile, this.board);
            if (captureResult.isValid) {
                // Mark captured pieces as dead
                captureResult.capturedPieces.forEach(piece => {
                    const pieceTile = piece.currentTile;
                    if (pieceTile) pieceTile.clear();
                    piece.state = 'dead';
                    piece.currentTile = null;
                    
                });

                this.selectedPiece.spawn(targetTile);
                moveSuccessful = true;
            }
            //Alt capture
            else if (captureAltResult.isValid) {
                // Mark captured pieces as dead
                captureAltResult.capturedPieces.forEach(piece => {
                    const pieceTile = piece.currentTile;
                    if (pieceTile) pieceTile.clear();
                    piece.state = 'dead';
                    piece.currentTile = null;
                });

                this.selectedPiece.spawn(targetTile);
                moveSuccessful = true;
            }
            // If no valid capture, check for valid move
            else if (this.selectedPiece.isValidMove(targetTile, this.board)) {
                this.selectedPiece.spawn(targetTile);
                moveSuccessful = true;
            }
            //Alt move
            else if (this.selectedPiece.isValidAltMove(targetTile, this.board)) {
                this.selectedPiece.spawn(targetTile);
                moveSuccessful = true;
            }
        }

        if (!moveSuccessful) {
            // Return piece to original position
            this.selectedPiece.spawn(this.dragStartTile);
        } else {
            // End turn if move was successful
            this.selectedPiece.hasMoved=true;
            console.log(targetY);
            if(this.selectedPiece.name=='pawn'  && (targetY===0 || targetY===7 )){
                board.transformPiece(this.selectedPiece, 'queen');
            }
            const pawns = board.getPiecesByType('pawn', 'enemy');
            for (let i = 0; i < pawns.length; i++) {
                pawns[i].hasDoubleMoved=false;
            }


            this.gameState.endTurn();
        }

        // Reset drag state
        this.isDragging = false;
        this.selectedPiece = null;
        this.dragStartTile = null;
        this.dragPosition = { x: 0, y: 0 };

        
    }

    // Separate drawing UI elements from piece drawing
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
}

