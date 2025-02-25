class Piece {
    constructor(name, color) {
        this.name = name;
        this.color = color;
        this.currentTile = null;
        this.hasMoved = false;
        this.hasDoubleMoved=false;
        this.state = 'alive';
        this.stats = {
            canMove: true,
            canAltMove: true,
            canCapture: true,
            canAltCapture: true
        }
    }
    createCaptureResult(isValid, capturedPieces = []) {
        return {
            isValid: isValid,
            capturedPieces: capturedPieces
        };
    }

    spawn(tile) {
        if (!(tile instanceof Tile)) {
            throw new Error('Invalid tile object');
        }
        if (tile.occupyingPiece) {
            throw new Error('Tile is already occupied');
        }
        this.currentTile = tile;
        tile.occupy(this);
    }
    transform(newPieceName) {
    // Create new piece of desired type
    const newPiece = Piece.createPiece(newPieceName, this.color);
    newPiece.board = this.board; // Transfer board reference

    // Transfer important properties
    newPiece.state = this.state;
    newPiece.hasMoved = this.hasMoved;

    // Replace this piece in the board's pieces array
    const pieceIndex = this.board.pieces.indexOf(this);
    if (pieceIndex > -1) {
        this.board.pieces[pieceIndex] = newPiece;
    }

    // Move to current tile if exists
    const tile = this.currentTile;
    if (tile) {
        tile.clear();
        newPiece.spawn(tile);
    }

    return newPiece;
    }

    // Add helper method to check if piece is of certain types
    isOfType(...types) {
        return types.includes(this.name);
    }
    // Factory method to create specific piece types
    static createPiece(name, color) {
        switch(name.toLowerCase()) {
            case 'pawn': return new Pawn(color);
            case 'rook': return new Rook(color);
            case 'knight': return new Knight(color);
            case 'bishop': return new Bishop(color);
            case 'queen': return new Queen(color);
            case 'king': return new King(color);
            case 'jumper': return new Jumper(color);
            case 'ogre': return new Ogre(color); // Add this line
            default: throw new Error('Invalid piece type');
        }
    }

    isPathClear(targetTile, board) {
        // Helper method to check if path is clear between current tile and target
        const dx = Math.sign(targetTile.x - this.currentTile.x);
        const dy = Math.sign(targetTile.y - this.currentTile.y);
        let x = this.currentTile.x + dx;
        let y = this.currentTile.y + dy;

        while (x !== targetTile.x || y !== targetTile.y) {
            if (board.getTileAt(x, y).occupyingPiece) {
                return false;
            }
            x += dx;
            y += dy;
        }
        return true;
    }
}

class Pawn extends Piece {
    constructor(color) {
        super('pawn', color);
    }

    isValidMove(targetTile, board) {
        const direction = this.color === 'white' ? -1 : 1;
        const startRank = this.color === 'white' ? 6 : 1;

        // Basic one square forward movement
        if (targetTile.x === this.currentTile.x &&
            targetTile.y === this.currentTile.y + direction &&
            !targetTile.occupyingPiece) {
            this.hasDoubleMoved=false;
            return true;
        }

        // Initial two square movement
        if (!this.hasMoved &&
            targetTile.x === this.currentTile.x &&
            targetTile.y === this.currentTile.y + (2 * direction) &&
            !targetTile.occupyingPiece &&
            !board.getTileAt(this.currentTile.x, this.currentTile.y + direction).occupyingPiece) {
            this.hasDoubleMoved=true;
            return true;
        }

        return false;
    }

    isValidCapture(targetTile, board) {
        const direction = this.color === 'white' ? -1 : 1;
        const isDiagonal = Math.abs(targetTile.x - this.currentTile.x) === 1 &&
                          targetTile.y === this.currentTile.y + direction;

        if (isDiagonal &&
            targetTile.occupyingPiece &&
            targetTile.occupyingPiece.color !== this.color) {
            return this.createCaptureResult(true, [targetTile.occupyingPiece]);
        }
        if (isDiagonal && 
            !targetTile.occupyingPiece && 
            board.getTileAt(targetTile.x, (targetTile.y)-direction).occupyingPiece && 
            board.getTileAt(targetTile.x, (targetTile.y)-direction).occupyingPiece.hasDoubleMoved){
                return this.createCaptureResult(true, [board.getTileAt(targetTile.x, (targetTile.y)-direction).occupyingPiece]);
        }


        return this.createCaptureResult(false);
    }
    isValidAltMove(targetTile, board) {
        return false;
    }

    isValidAltCapture(targetTile, board) {
        return false;
    }
}

class Rook extends Piece {
    constructor(color) {
        super('rook', color);
    }

    isValidMove(targetTile, board) {
        if (targetTile.occupyingPiece) return false;

        const sameRow = targetTile.y === this.currentTile.y;
        const sameCol = targetTile.x === this.currentTile.x;

        return (sameRow || sameCol) && this.isPathClear(targetTile, board);
    }

    isValidCapture(targetTile, board) {
        if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === this.color) {
            return this.createCaptureResult(false);
        }

        const sameRow = targetTile.y === this.currentTile.y;
        const sameCol = targetTile.x === this.currentTile.x;

        if ((sameRow || sameCol) && this.isPathClear(targetTile, board)) {
            return this.createCaptureResult(true, [targetTile.occupyingPiece]);
        }

        return this.createCaptureResult(false);
    }
    isValidAltMove(targetTile, board) {
        return false;
    }

    isValidAltCapture(targetTile, board) {
        return false;
    }
}

class Knight extends Piece {
    constructor(color) {
        super('knight', color);
    }

    isValidMove(targetTile, board) {
        if (targetTile.occupyingPiece) return false;

        const dx = Math.abs(targetTile.x - this.currentTile.x);
        const dy = Math.abs(targetTile.y - this.currentTile.y);

        return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
    }

    isValidCapture(targetTile, board) {
        if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === this.color) {
            return this.createCaptureResult(false);
        }

        const dx = Math.abs(targetTile.x - this.currentTile.x);
        const dy = Math.abs(targetTile.y - this.currentTile.y);

        if ((dx === 2 && dy === 1) || (dx === 1 && dy === 2)) {
            return this.createCaptureResult(true, [targetTile.occupyingPiece]);
        }

        return this.createCaptureResult(false);
    }
    isValidAltMove(targetTile, board) {
        return false;
    }

    isValidAltCapture(targetTile, board) {
        return false;
    }
}

class Bishop extends Piece {
    constructor(color) {
        super('bishop', color);
    }

    isValidMove(targetTile, board) {
        if (targetTile.occupyingPiece) return false;

        const dx = Math.abs(targetTile.x - this.currentTile.x);
        const dy = Math.abs(targetTile.y - this.currentTile.y);

        return dx === dy && this.isPathClear(targetTile, board);
    }

    isValidCapture(targetTile, board) {
        if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === this.color) {
            return this.createCaptureResult(false);
        }

        const dx = Math.abs(targetTile.x - this.currentTile.x);
        const dy = Math.abs(targetTile.y - this.currentTile.y);

        if (dx === dy && this.isPathClear(targetTile, board)) {
            return this.createCaptureResult(true, [targetTile.occupyingPiece]);
        }

        return this.createCaptureResult(false);
    }
    isValidAltMove(targetTile, board) {
        return false;
    }

    isValidAltCapture(targetTile, board) {
        return false;
    }
}

class Queen extends Piece {
    constructor(color) {
        super('queen', color);
    }

    isValidMove(targetTile, board) {
        if (targetTile.occupyingPiece) return false;

        const dx = Math.abs(targetTile.x - this.currentTile.x);
        const dy = Math.abs(targetTile.y - this.currentTile.y);
        const sameRow = targetTile.y === this.currentTile.y;
        const sameCol = targetTile.x === this.currentTile.x;

        return ((sameRow || sameCol) || dx === dy) && this.isPathClear(targetTile, board);
    }

    isValidCapture(targetTile, board) {
        if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === this.color) {
            return this.createCaptureResult(false);
        }

        const dx = Math.abs(targetTile.x - this.currentTile.x);
        const dy = Math.abs(targetTile.y - this.currentTile.y);
        const sameRow = targetTile.y === this.currentTile.y;
        const sameCol = targetTile.x === this.currentTile.x;

        if (((sameRow || sameCol) || dx === dy) && this.isPathClear(targetTile, board)) {
            return this.createCaptureResult(true, [targetTile.occupyingPiece]);
        }

        return this.createCaptureResult(false);
    }
    isValidAltMove(targetTile, board) {
        return false;
    }

    isValidAltCapture(targetTile, board) {
        return false;
    }
}
// pieces.js (continued)
class King extends Piece {
    constructor(color) {
        super('king', color);
    }

    isValidMove(targetTile, board) {
        if (targetTile.occupyingPiece) return false;

        const dx = Math.abs(targetTile.x - this.currentTile.x);
        const dy = Math.abs(targetTile.y - this.currentTile.y);

        return dx <= 1 && dy <= 1;
    }

    isValidCapture(targetTile, board) {
        if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === this.color) {
            return this.createCaptureResult(false);
        }

        const dx = Math.abs(targetTile.x - this.currentTile.x);
        const dy = Math.abs(targetTile.y - this.currentTile.y);

        if (dx <= 1 && dy <= 1) {
            return this.createCaptureResult(true, [targetTile.occupyingPiece]);
        }

        return this.createCaptureResult(false);
    }

    isValidAltMove(targetTile, board) {
        return false;
    }

    isValidAltCapture(targetTile, board) {
        return false;
    }

}
class Jumper extends Piece {
    constructor(color) {
        super('jumper', color);
    }

    isValidMove(targetTile, board) {
        if (targetTile.occupyingPiece) return false;

        const dx = targetTile.x - this.currentTile.x;
        const dy = targetTile.y - this.currentTile.y;

        // Direction check (white moves up, black moves down)
        const correctDirection = (this.color === 'white' && dy === -1) ||
                               (this.color === 'black' && dy === 1);

        // Diagonal movement check
        return Math.abs(dx) === 1 && correctDirection;
    }

    isValidCapture(targetTile, board) {
        if (targetTile.occupyingPiece) return this.createCaptureResult(false);

        const dx = targetTile.x - this.currentTile.x;
        const dy = targetTile.y - this.currentTile.y;

        // Must move exactly two squares diagonally
        if (Math.abs(dx) !== 2 || Math.abs(dy) !== 2) {
            return this.createCaptureResult(false);
        }

        // Direction check (can capture in both directions unlike regular moves)
        const midX = this.currentTile.x + dx/2;
        const midY = this.currentTile.y + dy/2;

        // Check the piece being jumped over
        const jumpedTile = board.getTileAt(midX, midY);
        if (!jumpedTile || !jumpedTile.occupyingPiece ||
            jumpedTile.occupyingPiece.color === this.color) {
            return this.createCaptureResult(false);
        }

        return this.createCaptureResult(true, [jumpedTile.occupyingPiece]);
    }
    isValidAltMove(targetTile, board) {
        return false;
    }

    isValidAltCapture(targetTile, board) {
        return false;
    }
}
// In pieces.js
class Ogre extends Piece {
    constructor(color) {
        super('ogre', color);
    }

    isValidMove(targetTile, board) {
        if (targetTile.occupyingPiece) return false;

        const dx = targetTile.x - this.currentTile.x;
        const dy = targetTile.y - this.currentTile.y;

        // Ogre moves two spaces in cardinal directions only
        return (Math.abs(dx) === 2 && dy === 0) ||
               (Math.abs(dy) === 2 && dx === 0);
    }

    isValidCapture(targetTile, board) {
        if (!targetTile.occupyingPiece ||
            targetTile.occupyingPiece.color === this.color) {
            return this.createCaptureResult(false);
        }

        const dx = targetTile.x - this.currentTile.x;
        const dy = targetTile.y - this.currentTile.y;

        // Same movement pattern as regular moves
        if ((Math.abs(dx) === 2 && dy === 0) ||
            (Math.abs(dy) === 2 && dx === 0)) {
            return this.createCaptureResult(true, [targetTile.occupyingPiece]);
        }

        return this.createCaptureResult(false);
    }
    isValidAltMove(targetTile, board) {
        return false;
    }

    isValidAltCapture(targetTile, board) {
        return false;
    }
}
