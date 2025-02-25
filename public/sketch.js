// sketch.js
let drawManager;
// Piece emoji mapping
const PIECE_EMOJIS = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙',
        jumper: '⛀',
        ogre: '🧌'  // white ogre
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟',
        jumper: '⛂',
        ogre: '👹'  // red oni (Japanese ogre)
    }
};


class Tile {
    constructor(x, y, board) {  // Add board parameter
        this.x = x;
        this.y = y;
        this.type = 'normal';
        this.state = 'normal';
        this.occupyingPiece = null;
        this.board = board;  // Store reference to the board
    }

    occupy(piece) {
        if (this.occupyingPiece) {
            throw new Error(`Tile at ${this.x},${this.y} is already occupied`);
        }
        this.occupyingPiece = piece;
    }

    clear() {
        this.occupyingPiece = null;
    }
    resetState() {
        this.state = 'normal';
    }
}
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
            king: 0
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

class Board {
    constructor(width = 8, height = 8) {
        this.width = width;
        this.height = height;
        this.tiles = this.createTiles();
        this.pieces = [];
    }

    addPiece(piece) {
        this.pieces.push(piece);
    }
    transformPiece(piece, newPieceName) {
        if (!piece || piece.state === 'dead') return false;

        // Create new piece of the desired type
        const newPiece = Piece.createPiece(newPieceName, piece.color);

        // Store the current tile
        const currentTile = piece.currentTile;
        if (!currentTile) return false;

        // Remove old piece
        currentTile.clear();
        piece.state = 'dead';

        // Place new piece
        newPiece.spawn(currentTile);

        // Update pieces array
        const index = this.pieces.indexOf(piece);
        if (index > -1) {
            this.pieces[index] = newPiece;
        } else {
            this.pieces.push(newPiece);
        }

        return true;
    }
    createTiles() {
        const tiles = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                tiles.push(new Tile(x, y, this));  // Pass this (board) to tile
            }
        }
        return tiles;
    }

    getTileAt(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.tiles.find(tile => tile.x === x && tile.y === y);
    }

    getState() {
        return {
            tiles: this.tiles,
            pieces: this.pieces
        };
    }

    resetTileStates() {
        this.tiles.forEach(tile => tile.resetState());
    }
    getPiecesByType(pieceName, colorRequirement = 'any') {
        return this.pieces.filter(piece => {
            if (piece.state === 'dead') return false;
            if (piece.name !== pieceName) return false;

            switch(colorRequirement) {
                case 'own':
                    return piece.color === this.gameState.currentPlayer;
                case 'enemy':
                    return piece.color !== this.gameState.currentPlayer;
                case 'any':
                    return true;
                default:
                    return false;
            }
        });
    }
}

// p5.js specific code
let board;
let tileSize;
let gameController;
let cardImage;

function preload() {
    cardImage = loadImage("assets/example.png")
}

var socket;

function setup() {
    // Make canvas wider to accommodate graveyards
    createCanvas(1000, 800);
    board = new Board();
    tileSize = 800 / 8; // Board size remains 800x800
    drawManager = new DrawManager();
    // Create graveyards
    whiteGraveyard = new Graveyard('white', 810, 400, 180, 390);
    blackGraveyard = new Graveyard('black', 810, 10, 180, 390);

    gameController = new GameController(board);
    board.gameState = gameController.gameState;

    // When creating pieces, add them to the board's piece array
    function setupPiece(name, color, x, y) {
        const piece = Piece.createPiece(name, color);
        piece.spawn(board.getTileAt(x, y));
        board.addPiece(piece);
    }

    // Set up black pieces
    setupPiece('rook', 'black', 0, 0);
    setupPiece('knight', 'black', 1, 0);
    setupPiece('bishop', 'black', 2, 0);
    setupPiece('queen', 'black', 3, 0);
    setupPiece('king', 'black', 4, 0);
    setupPiece('bishop', 'black', 5, 0);
    setupPiece('knight', 'black', 6, 0);
    setupPiece('rook', 'black', 7, 0);

    // Set up black pawns
    for(let i = 0; i < 8; i++) {
        setupPiece('pawn', 'black', i, 1);
    }

    // Set up white pieces
    setupPiece('rook', 'white', 0, 7);
    setupPiece('knight', 'white', 1, 7);
    setupPiece('bishop', 'white', 2, 7);
    setupPiece('queen', 'white', 3, 7);
    setupPiece('king', 'white', 4, 7);
    setupPiece('bishop', 'white', 5, 7);
    setupPiece('knight', 'white', 6, 7);
    setupPiece('rook', 'white', 7, 7);

    // Set up white pawns
    for(let i = 0; i < 8; i++) {
        setupPiece('pawn', 'white', i, 6);
    }
    setupPiece('ogre', 'white', 5, 5);
    setupPiece('jumper', 'black', 2, 2);

    socket = io.connect("http://localhost:3000");
}

function draw() {
    background(220);

    // Draw board
    drawManager.drawBoard(board.getState());

    // Draw graveyards
    drawManager.drawGraveyard(whiteGraveyard.getState());
    drawManager.drawGraveyard(blackGraveyard.getState());

    // Draw UI elements
    const uiState = gameController.getUIState();

    if (uiState.dragState) {
        drawManager.drawDraggedPiece(
            uiState.dragState.piece,
            uiState.dragState.position
        );
    }

    if (uiState.cardState) {
        drawManager.drawCard(uiState.cardState);
    }

    if (uiState.buttonStates) {
        drawManager.drawCardButtons(uiState.buttonStates);
    }
}
   

function mousePressed() {
    gameController.mousePressed(mouseX, mouseY);
}

function mouseDragged() {
    gameController.mouseDragged(mouseX, mouseY);
}

function mouseReleased() {
    gameController.mouseReleased(mouseX, mouseY);
}

