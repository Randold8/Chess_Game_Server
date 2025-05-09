// draw.js
const PIECE_EMOJIS = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙',
        jumper: '⛀',
        ogre: '🧌'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟',
        jumper: '⛂',
        ogre: '👹'
    }
};
class DrawManager {
    constructor() {
        this.tileSize = 800 / 8;
        this.pieceEmojis = PIECE_EMOJIS;
    }

    drawBoard(boardState) {
        // Draw tiles
        boardState.tiles.forEach(tile => this.drawTile(tile));

        // Draw only alive pieces
        boardState.pieces.forEach(piece => {
            if (piece.state === 'alive' && piece.currentTile) {
                this.drawPiece(piece);
            }
        });
    }

    drawTile(tile) {
        let baseColor;
        switch(tile.state) {
            case 'selectable':
                baseColor = (tile.x + tile.y) % 2 === 0 ?
                    color(200, 255, 200) : // Light green
                    color(150, 200, 150);  // Dark green
                break;
            case 'selected':
                baseColor = (tile.x + tile.y) % 2 === 0 ?
                    color(150, 255, 150) : // Brighter green
                    color(100, 200, 100);  // Darker green
                break;
            default: // 'normal'
                baseColor = (tile.x + tile.y) % 2 === 0 ?
                    color(255) : // White
                    color(128);  // Gray
        }

        fill(baseColor);
        noStroke();
        rect(tile.x * this.tileSize, tile.y * this.tileSize,
             this.tileSize, this.tileSize);
    }

    drawPiece(piece) {
        if (piece.state !== 'alive') return;

        fill(0);
        textAlign(CENTER, CENTER);
        textSize(this.tileSize * 0.8);
        text(
            this.pieceEmojis[piece.color][piece.name],
            piece.currentTile.x * this.tileSize + this.tileSize/2,
            piece.currentTile.y * this.tileSize + this.tileSize/2
        );
    }

    drawDraggedPiece(piece, position) {
        if (!piece) return;

        fill(0);
        textAlign(CENTER, CENTER);
        textSize(this.tileSize * 0.8);
        text(
            this.pieceEmojis[piece.color][piece.name],
            position.x + this.tileSize/2,
            position.y + this.tileSize/2
        );
    }

    drawGraveyard(graveyardState) {
        fill(200);
        rect(graveyardState.x, graveyardState.y,
             graveyardState.width, graveyardState.height);

        let xOffset = 10;
        let yOffset = 20;
        textSize(this.tileSize * 0.4);

        Object.entries(graveyardState.deadPieces).forEach(([pieceName, count]) => {
            if (count > 0) {
                fill(0);
                textAlign(LEFT, CENTER);
                text(this.pieceEmojis[graveyardState.color][pieceName],
                     graveyardState.x + xOffset,
                     graveyardState.y + yOffset);

                text(`x${count}`,
                     graveyardState.x + xOffset + this.tileSize * 0.5,
                     graveyardState.y + yOffset);

                yOffset += this.tileSize * 0.5;
            }
        });
    }

    drawCard(cardState) {
        if (!cardState) {
            console.log("No card state provided to drawCard");
            return;
        }
    
    
        // Simple, reliable card drawing
        push(); // Save drawing context
    
        // Draw card background
        fill(245, 222, 179); // Wheat color
        stroke(0);
        strokeWeight(2);
        rect(cardState.x, cardState.y, cardState.width, cardState.height, 10);
    
        // Draw card name
        fill(0);
        noStroke();
        textSize(24);
        textAlign(CENTER, TOP);
        text(cardState.name,
             cardState.x + cardState.width/2,
             cardState.y + 20);
    
        // Draw card description
        textSize(16);
        textAlign(CENTER, TOP);
        text(cardState.description,
             cardState.x + cardState.width/2,
             cardState.y + 60);
    
        // Draw buttons
        if (cardState.buttons) {
            // OK button
            fill(200);
            rect(cardState.buttons[0].x, cardState.buttons[0].y,
                 cardState.buttons[0].width, cardState.buttons[0].height);
            fill(0);
            textAlign(CENTER, CENTER);
            text("OK",
                 cardState.buttons[0].x + cardState.buttons[0].width/2,
                 cardState.buttons[0].y + cardState.buttons[0].height/2);
    
            // Decline button
            fill(200);
            rect(cardState.buttons[1].x, cardState.buttons[1].y,
                 cardState.buttons[1].width, cardState.buttons[1].height);
            fill(0);
            textAlign(CENTER, CENTER);
            text("Decline",
                 cardState.buttons[1].x + cardState.buttons[1].width/2,
                 cardState.buttons[1].y + cardState.buttons[1].height/2);
        }
    
        pop(); // Restore drawing context
    }
    


    drawCardButtons(buttonStates) {
        buttonStates.forEach(button => {
            fill(200);
            rect(button.x, button.y, button.width, button.height);

            fill(0);
            textAlign(CENTER, CENTER);
            text(button.text,
                 button.x + button.width/2,
                 button.y + button.height/2);
        });
    }
}
function getCardImage(cardName) {
    // You would implement a mapping of card names to loaded images
    // For now, return a default image
    switch(cardName.toLowerCase()) {
        case 'polymorph': return polymorphImage;
        case 'onslaught': return onslaughtImage;
        case 'bizarremutation': return mutationImage;
        case 'draught': return draughtImage;
        case 'telekinesis': return telekinesisImage;
        case 'topsyturvy': return topsyturvyImage;
        default: return cardImage;
    }
}


