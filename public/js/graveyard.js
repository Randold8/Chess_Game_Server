class Graveyard {
    constructor(color, x, y, width, height) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.deadPieces = {
            pawn: 0,
            rook: 0,
            knight: 0,
            bishop: 0,
            queen: 0,
            king: 0,
            jumper: 0,
            ogre: 0
        };
    }

    updateDeadPieces(board) {
        // Reset counts
        Object.keys(this.deadPieces).forEach(key => this.deadPieces[key] = 0);

        // Count dead pieces
        board.pieces.forEach(piece => {
            if (piece.color === this.color && piece.state === 'dead') {
                this.deadPieces[piece.name]++;
            }
        });
    }

    getState() {
        return {
            color: this.color,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            deadPieces: this.deadPieces
        };
    }
}
