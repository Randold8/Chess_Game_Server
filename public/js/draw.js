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
    drawGameOver(gameOverState) {
        const winner = gameOverState.winner;

        // Semi-transparent overlay
        push();
        fill(0, 0, 0, 150);
        rect(0, 0, width, height);

        // Game over message
        textAlign(CENTER, CENTER);
        textSize(48);
        fill(255);
        text("GAME OVER", width/2, height/2 - 50);

        // Winner message
        textSize(36);
        const winnerText = winner.charAt(0).toUpperCase() + winner.slice(1);
        fill(winner === 'white' ? color(255) : color(150));
        text(`${winnerText} wins!`, width/2, height/2 + 30);
        pop();
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
        if (piece.state !== 'alive' || !piece.currentTile) return;
    
        const tx = piece.currentTile.x * this.tileSize;
        const ty = piece.currentTile.y * this.tileSize;
        const centerX = tx + this.tileSize/2;
        const centerY = ty + this.tileSize/2;
    
        // Determine color and animation for Topsy-Turvy pawns
        let pawnFill = null;
        if (piece.name === 'pawn' && piece.topsyTurvyActive) {
            // Much slower pulse!
            const t = (typeof frameCount !== "undefined" ? frameCount : Date.now()/16) * 0.02;
            let r, g, b;
            if (piece.color === "white") {
                // Pink pulse for white pawn
                r = 210 + 30 * Math.abs(Math.sin(t));
                g = 60  + 10 * Math.abs(Math.sin(t));
                b = 160 + 20 * Math.abs(Math.sin(t));
            } else {
                // Dark purple pulse for black pawn
                r = 60  + 15 * Math.abs(Math.sin(t));   // lowered base and amplitude
                g = 20  + 10 * Math.abs(Math.sin(t));   // lowered base and amplitude
                b = 80  + 20 * Math.abs(Math.sin(t));   // darker blue-purple
            }
            pawnFill = color(r, g, b);
        }
    
        // Draw the piece emoji/text
        textAlign(CENTER, CENTER);
        textSize(this.tileSize * 0.8);
        if (pawnFill) {
            fill(pawnFill);
        } else {
            fill(0); // Default: black
        }
        text(
            this.pieceEmojis[piece.color][piece.name],
            centerX,
            centerY
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
        fill(210);
        rect(graveyardState.x, graveyardState.y,
             graveyardState.width, graveyardState.height, 10);

        const iconSize = 28;
        const textSizeVal = 18;
        const colCount = 2;
        const xStep = 60;
        const yStep = 40;
        const yOffsetStart = 36;
        const totalWidth = (colCount - 1) * xStep + iconSize + 30;
        const xOffsetStart = graveyardState.x + (graveyardState.width - totalWidth) / 2;

        let i = 0;
        Object.entries(graveyardState.deadPieces).forEach(([pieceName, count]) => {
            if (count > 0) {
                const col = i % colCount;
                const row = Math.floor(i / colCount);
                const x = xOffsetStart + col * xStep;
                const y = graveyardState.y + yOffsetStart + row * yStep;

                fill(0);
                textAlign(LEFT, CENTER);
                textSize(iconSize);
                text(this.pieceEmojis[graveyardState.color][pieceName], x, y);

                textSize(textSizeVal);
                text(`x${count}`, x + iconSize + 2, y);

                i++;
            }
        });
    }

    drawCard(cardState) {
        if (!cardState) {
            console.log("No card state provided to drawCard");
            return;
        }
    
        // Fixed position for card on the right side
        const cardX = 810;
        const cardY = 200;
        const cardWidth = 180;
        const cardHeight = 300;
    
        push(); // Save drawing context
    
        // Draw card background
        fill(245, 222, 179); // Wheat color
        stroke(139, 69, 19); // Brown border
        strokeWeight(3);
        rect(cardX, cardY, cardWidth, cardHeight, 15); // Rounded corners
    
        // Try to draw card image if available
        const cardImg = getCardImage(cardState.image);
        if (cardImg) {
            image(
                cardImg,
                cardX + 10,
                cardY + 50,
                cardWidth - 20,
                120
            );
        }
    
        // Draw card name
        fill(139, 69, 19); // Dark brown text
        noStroke();
        textSize(24);
        textAlign(CENTER, TOP);
        text(
            cardState.name,
            cardX + cardWidth/2,
            cardY + 15
        );
    
        // Draw card description
        textSize(16);
        textAlign(CENTER, TOP);
        textWrap(WORD);
        text(
            cardState.description,
            cardX + 10,
            cardY + 180,
            cardWidth - 20
        );
    
        // FIXED POSITIONS FOR BUTTONS
        const okButtonX = cardX + 30;
        const okButtonY = cardY + cardHeight - 40;
        const declineButtonX = cardX + cardWidth - 90;
        const declineButtonY = cardY + cardHeight - 40;
        const buttonWidth = 60;
        const buttonHeight = 30;
    
        // OK button
        fill(100, 200, 100); // Green button
        stroke(0);
        strokeWeight(1);
        rect(okButtonX, okButtonY, buttonWidth, buttonHeight, 5);
    
        fill(0);
        noStroke();
        textSize(12); // VERY SMALL FONT SIZE
        textAlign(CENTER, CENTER);
        text(
            "OK",
            okButtonX + buttonWidth/2,
            okButtonY + buttonHeight/2
        );
    
        // Decline button
        fill(200, 100, 100); // Red button
        stroke(0);
        strokeWeight(1);
        rect(declineButtonX, declineButtonY, buttonWidth, buttonHeight, 5);
    
        fill(0);
        noStroke();
        textSize(12); // VERY SMALL FONT SIZE
        textAlign(CENTER, CENTER);
        text(
            "Decline",
            declineButtonX + buttonWidth/2,
            declineButtonY + buttonHeight/2
        );
    
        pop(); // Restore drawing context
    
        // Update global coordinates for button detection
        window.cardButtonPositions = {
            okButton: {
                x: okButtonX,
                y: okButtonY,
                width: buttonWidth,
                height: buttonHeight
            },
            declineButton: {
                x: declineButtonX,
                y: declineButtonY,
                width: buttonWidth,
                height: buttonHeight
            }
        };
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
function getCardImage(imageName) {
    if (!imageName || !window.cardImages) {
        return window.cardImages?.default || null;
    }

    // Convert to lowercase and remove spaces
    const normalizedName = imageName.toLowerCase().replace(/\s+/g, "");

    // Try to find the image
    const img = window.cardImages[normalizedName];

    // For debugging
    if (!img) {
        console.log(`Card image not found: ${normalizedName}`);
        console.log('Available images:', Object.keys(window.cardImages));
    }

    return img || window.cardImages.default;
}



