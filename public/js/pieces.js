class Pawn extends window.Piece {
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
window.Piece.registerPieceType('pawn', Pawn);

class Rook extends window.Piece {
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
window.Piece.registerPieceType('rook', Rook);

class Knight extends window.Piece {
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
window.Piece.registerPieceType('knight', Knight);
class Bishop extends window.Piece {
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
window.Piece.registerPieceType('bishop', Bishop);
class Queen extends window.Piece {
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
window.Piece.registerPieceType('queen', Queen);
// pieces.js (continued)
class King extends window.Piece {
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
window.Piece.registerPieceType('king', King);
class Jumper extends window.Piece {
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
window.Piece.registerPieceType('jumper', Jumper);
// In pieces.js
class Ogre extends window.Piece {
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
window.Piece.registerPieceType('ogre', Ogre);
// В конце pieces.js
console.log("All piece types registered, setting ready state");
window.Piece.setReady();