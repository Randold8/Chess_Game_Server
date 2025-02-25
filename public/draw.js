// draw.js

class DrawManager {
    constructor() {
        this.tileSize = 800 / 8;
        this.pieceEmojis = PIECE_EMOJIS;
    }

    drawBoard(boardState) {
        // Draw tiles
        boardState.tiles.forEach(tile => this.drawTile(tile));

        // Draw pieces
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
        if (!cardState) return;

        const cornerRadius = 10;
        const padding = 15;
        const textYOffset = 40; // Adjust offset for text below image

        fill(cardState.color);
        stroke(0);
        rect(cardState.x, cardState.y, cardState.width, cardState.height, cornerRadius);
    
            // draw the image
        if(cardState.image) {
            imageMode(CENTER);
                
                // Calculate image size and position
            let imageSize = Math.min(cardState.width - padding * 2, cardState.height * 0.4); // Adjust these values
            let imageY = cardState.y + imageSize/2 + padding; // Position the image in the top
    
            let currentImage = cardState.image === 'polymorph.png' ? polymorphImage : cardImage;
    
            image(currentImage,
                cardState.x + cardState.width/2,
                imageY,
                imageSize, imageSize);
        
            fill(0);
            textAlign(CENTER, TOP);
            textSize(20);
            text(cardState.name,
                cardState.x + cardState.width / 2,
                imageY + imageSize/2 + padding);
    
             
            textSize(16);
            textAlign(CENTER, TOP);
            textWrap(WORD);

            text(cardState.description,
                cardState.x + padding,
                imageY + imageSize/2 + padding + textYOffset,
                cardState.width - 2 * padding);
            }
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


