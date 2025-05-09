// gameState.js
class GameState {
    constructor(board) {
        this.board = board;
        this.currentPlayer = 'white';
        this.playerColor = null;
        this.turnNumber = 0;
        this.cardDrawInterval = 2; // Draw every 3rd turn
        this.cardDrawCounter = 0;  // Initialize counter
        this.currentCard = null;
        this.phase = 'normal';
        this.cardManager = new CardManager(board);
    
        // Debug log
        console.log('GameState initialized with card draw interval:', this.cardDrawInterval);
    }

    startTurn() {
        console.log(`Starting turn ${this.turnNumber} for player ${this.currentPlayer}`);
        // Card drawing is now handled by the server, so we don't need to do anything here
    }
    
    // Remove the drawCard method or keep it for debugging only
    drawCard() {
        console.log('WARNING: Local drawCard called but cards should come from server');
        // This method is kept for debugging but should not be used in normal gameplay
    }

    handleCardSelection(tile) {
        if (!this.currentCard || this.phase !== 'card-selection') return;

        // If the tile has a piece, pass the piece. Otherwise, pass the tile itself
        const selectTarget = tile.occupyingPiece || tile;
        this.currentCard.toggleSelection(selectTarget);
    }
    
handlePieceSelection(tile) {
    if (this.phase !== 'normal') return;

    // Reset all tile states first
    this.board.resetTileStates();

    if (tile.occupyingPiece) {
        // For each tile on the board, check if it's a valid move
        this.board.tiles.forEach(eachTile => {
            // Don't highlight the current tile as a valid move
            if (eachTile !== tile) {
                const isValidMove = tile.occupyingPiece.isValidMove(eachTile, this.board);
                const captureResult = tile.occupyingPiece.isValidCapture(eachTile, this.board);

                if (isValidMove || captureResult.isValid) {
                    eachTile.state = 'selectable';
                }
            }
        });
    }
} 


    

executeCard() {
    if (!this.currentCard || this.phase !== 'card-selection') {
        console.log("No card to execute or not in card selection phase");
        return;
    }

    // Only execute if we're at the final stage and all selections are complete
    if (this.currentCard.currentStage === this.currentCard.stages - 1 &&
        this.currentCard.isStageComplete()) {

        console.log("Executing card:", this.currentCard.name);
        const result = this.currentCard.execute();

        if (result) {
            console.log('Card execution sent to server');
            // We'll keep the card visible until we get response from server
        } else {
            console.log('Card execution failed locally');
            this.declineCard();
        }
    } else {
        console.log('Card not ready to execute - incomplete stages',
                   `currentStage: ${this.currentCard.currentStage}, isComplete: ${this.currentCard.isStageComplete()}`);
    }
}

declineCard() {
    if (!this.currentCard || this.phase !== 'card-selection') return;

    console.log('Declining card:', this.currentCard?.name || 'unknown');

    // Tell the server we're declining
    gameController.networkManager.sendDeclineCard();

    // Clean up locally
    this.board.resetTileStates();
    this.currentCard = null;
    this.phase = 'normal';
}

    endTurn() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.startTurn();
    }



    // Update button hit detection to match new positions
    isOverOkButton(x, y) {
        if (!this.currentCard || this.phase !== 'card-selection') return false;
    
        const cardState = this.currentCard.getState();
        if (!cardState.buttons || cardState.buttons.length === 0) return false;
    
        const okButton = cardState.buttons[0];
        return x >= okButton.x && x <= okButton.x + okButton.width &&
               y >= okButton.y && y <= okButton.y + okButton.height;
    }
    
    isOverDeclineButton(x, y) {
        if (!this.currentCard || this.phase !== 'card-selection') return false;
    
        const cardState = this.currentCard.getState();
        if (!cardState.buttons || cardState.buttons.length < 2) return false;
    
        const declineButton = cardState.buttons[1];
        return x >= declineButton.x && x <= declineButton.x + declineButton.width &&
               y >= declineButton.y && y <= declineButton.y + declineButton.height;
    }
    updateTileStates(reset = true) {
        // Reset all tiles first
        if (reset) this.board.resetTileStates();
        // If there's an active card in selection phase, update tile states
        if (this.currentCard && this.phase === 'card-selection') {
            this.currentCard.determineSelectables();

            // Update tile states based on selectables
            this.currentCard.selectableTiles.forEach(tile => {
                tile.state = 'selectable';
            });

            // Update selected tiles
            for (let stage = 0; stage <= this.currentCard.currentStage; stage++) {
                const stageSelections = this.currentCard.selectedObjects.get(stage);
                if (stageSelections) {
                    stageSelections.forEach((targetTile, selection) => {
                        targetTile.state = 'selected';
                    });
                }
            }
        }
    }
    forceShowCard() {
        if (this.currentCard) {
            console.log("Forcing card display:", this.currentCard.name);
            this.phase = 'card-selection';
        } else {
            console.log("No card available to show");
    
            // Force create a test card
            const availableCards = this.cardManager.getAvailableCards();
            if (availableCards.length > 0) {
                const CardClass = availableCards[0];
                this.currentCard = new CardClass(this.board);
                this.currentCard.reset();
                this.phase = 'card-selection';
                console.log("Created test card:", this.currentCard.name);
            }
        }
    }

    

}


