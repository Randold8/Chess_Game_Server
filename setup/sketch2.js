let board = Array(8).fill().map(() => Array(8).fill(null));
let selectedPiece = null;
let tileSize = 80;
let selectedTile = null;

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

function setup() {
    const canvas = createCanvas(640, 640);
    canvas.parent('canvas-container');
    textFont('Arial');
    setupEventListeners();
    updateCodeOutput();
}

function draw() {
    background(220);
    drawBoard();
    drawPieces();
}

function drawBoard() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            let baseColor;
            if (selectedTile && selectedTile.x === i && selectedTile.y === j) {
                baseColor = (i + j) % 2 === 0 ?
                    color(150, 255, 150) : // Brighter green
                    color(100, 200, 100);  // Darker green
            } else {
                baseColor = (i + j) % 2 === 0 ?
                    color(255) :  // White
                    color(128);   // Gray
            }

            fill(baseColor);
            noStroke();
            rect(i * tileSize, j * tileSize, tileSize, tileSize);
        }
    }
}

function drawPieces() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (board[i][j]) {
                const piece = board[i][j];
                drawPiece(piece, i, j);
            }
        }
    }
}

function drawPiece(piece, x, y) {
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(tileSize * 0.8);
    text(
        PIECE_EMOJIS[piece.color][piece.type],
        x * tileSize + tileSize/2,
        y * tileSize + tileSize/2
    );
}

function mouseMoved() {
    const x = floor(mouseX / tileSize);
    const y = floor(mouseY / tileSize);
    if (x >= 0 && x < 8 && y >= 0 && y < 8) {
        selectedTile = { x, y };
    } else {
        selectedTile = null;
    }
}

function mousePressed() {
    if (mouseButton === LEFT && selectedPiece) {
        const x = floor(mouseX / tileSize);
        const y = floor(mouseY / tileSize);
        if (x >= 0 && x < 8 && y >= 0 && y < 8) {
            board[x][y] = {
                type: selectedPiece.type,
                color: selectedPiece.color
            };
            updateCodeOutput();
        }
    } else if (mouseButton === RIGHT) {
        const x = floor(mouseX / tileSize);
        const y = floor(mouseY / tileSize);
        if (x >= 0 && x < 8 && y >= 0 && y < 8) {
            board[x][y] = null;
            updateCodeOutput();
        }
        return false;
    }
}

function setupEventListeners() {
    // Piece selection buttons
    document.querySelectorAll('.piece-buttons button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.piece-buttons button').forEach(b =>
                b.classList.remove('selected'));
            button.classList.add('selected');
            selectedPiece = {
                type: button.dataset.piece,
                color: button.dataset.color
            };
        });
    });

    // Reset to standard layout
    document.getElementById('resetStandard').addEventListener('click', () => {
        board = Array(8).fill().map(() => Array(8).fill(null));

        // Standard chess layout
        const standardLayout = {
            black: {
                0: ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
                1: Array(8).fill('pawn')
            },
            white: {
                7: ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
                6: Array(8).fill('pawn')
            }
        };

        for (let color in standardLayout) {
            for (let row in standardLayout[color]) {
                standardLayout[color][row].forEach((piece, col) => {
                    board[col][parseInt(row)] = {type: piece, color: color};
                });
            }
        }
        updateCodeOutput();
    });

    // Clear board
    document.getElementById('clearBoard').addEventListener('click', () => {
        board = Array(8).fill().map(() => Array(8).fill(null));
        updateCodeOutput();
    });

    // Prevent context menu on right click
    document.addEventListener('contextmenu', e => e.preventDefault());
}

function updateCodeOutput() {
    let code = '// Setup pieces\n';
    let remainingPieces = [...getAllPieces()];

    // First pass: Find and process all possible rectangles
    const rectangles = findRectangles(remainingPieces)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));

    rectangles.forEach(rect => {
        if ((rect.width * rect.height) > Math.max(rect.width, rect.height)) {
            code += generateRectangleCode(rect);
            remainingPieces = remainingPieces.filter(p =>
                !rect.pieces.some(rp => rp.x === p.x && rp.y === p.y));
        }
    });

    // Second pass: Find horizontal lines
    for (let y = 0; y < 8; y++) {
        const horizontalLines = findHorizontalLines(remainingPieces, y);
        horizontalLines.forEach(line => {
            if (line.length >= 3) {
                code += generateHorizontalLineCode(line);
                remainingPieces = remainingPieces.filter(p =>
                    !line.pieces.some(lp => lp.x === p.x && lp.y === p.y));
            }
        });
    }

    // Third pass: Find vertical lines
    for (let x = 0; x < 8; x++) {
        const verticalLines = findVerticalLines(remainingPieces, x);
        verticalLines.forEach(line => {
            if (line.length >= 3) {
                code += generateVerticalLineCode(line);
                remainingPieces = remainingPieces.filter(p =>
                    !line.pieces.some(lp => lp.x === p.x && lp.y === p.y));
            }
        });
    }

    // Finally, handle remaining individual pieces
    if (remainingPieces.length > 0) {
        code += '\n// Individual pieces\n';
        remainingPieces.forEach(piece => {
            code += `setupPiece('${piece.type}', '${piece.color}', ${piece.x}, ${piece.y});\n`;
        });
    }

    document.getElementById('setup-code').textContent = code;
}

function findHorizontalLines(pieces, y) {
    const lines = [];
    const rowPieces = pieces.filter(p => p.y === y).sort((a, b) => a.x - b.x);
    let currentLine = null;

    rowPieces.forEach((piece, index) => {
        if (!currentLine) {
            currentLine = {
                type: piece.type,
                color: piece.color,
                startX: piece.x,
                y: piece.y,
                pieces: [piece],
                length: 1
            };
        } else if (
            piece.x === currentLine.pieces[currentLine.pieces.length - 1].x + 1 &&
            piece.type === currentLine.type &&
            piece.color === currentLine.color
        ) {
            currentLine.pieces.push(piece);
            currentLine.length++;
        } else {
            if (currentLine.length >= 3) {
                lines.push(currentLine);
            }
            currentLine = {
                type: piece.type,
                color: piece.color,
                startX: piece.x,
                y: piece.y,
                pieces: [piece],
                length: 1
            };
        }
    });

    if (currentLine && currentLine.length >= 3) {
        lines.push(currentLine);
    }

    return lines;
}

function findVerticalLines(pieces, x) {
    const lines = [];
    const colPieces = pieces.filter(p => p.x === x).sort((a, b) => a.y - b.y);
    let currentLine = null;

    colPieces.forEach((piece, index) => {
        if (!currentLine) {
            currentLine = {
                type: piece.type,
                color: piece.color,
                x: piece.x,
                startY: piece.y,
                pieces: [piece],
                length: 1
            };
        } else if (
            piece.y === currentLine.pieces[currentLine.pieces.length - 1].y + 1 &&
            piece.type === currentLine.type &&
            piece.color === currentLine.color
        ) {
            currentLine.pieces.push(piece);
            currentLine.length++;
        } else {
            if (currentLine.length >= 3) {
                lines.push(currentLine);
            }
            currentLine = {
                type: piece.type,
                color: piece.color,
                x: piece.x,
                startY: piece.y,
                pieces: [piece],
                length: 1
            };
        }
    });

    if (currentLine && currentLine.length >= 3) {
        lines.push(currentLine);
    }

    return lines;
}

function generateHorizontalLineCode(line) {
    return `// Horizontal line of ${line.length} ${line.type}s\n` +
           `for(let i = ${line.startX}; i < ${line.startX + line.length}; i++) {\n` +
           `    setupPiece('${line.type}', '${line.color}', i, ${line.y});\n` +
           `}\n`;
}

function generateVerticalLineCode(line) {
    return `// Vertical line of ${line.length} ${line.type}s\n` +
           `for(let i = ${line.startY}; i < ${line.startY + line.length}; i++) {\n` +
           `    setupPiece('${line.type}', '${line.color}', ${line.x}, i);\n` +
           `}\n`;
}
function getAllPieces() {
    const pieces = [];
    for (let j = 0; j < 8; j++) {
        for (let i = 0; i < 8; i++) {
            if (board[i][j]) {
                pieces.push({
                    type: board[i][j].type,
                    color: board[i][j].color,
                    x: i,
                    y: j
                });
            }
        }
    }
    return pieces;
}
function findRectangles(pieces) {
    const rectangles = [];
    const processed = new Set();

    // Sort pieces by position for more efficient rectangle finding
    const sortedPieces = pieces.sort((a, b) =>
        (a.y * 8 + a.x) - (b.y * 8 + b.x));

    for (let i = 0; i < sortedPieces.length; i++) {
        const start = sortedPieces[i];
        if (processed.has(`${start.x},${start.y}`)) continue;

        const sameTypeColor = pieces.filter(p =>
            p.type === start.type &&
            p.color === start.color);

        // Find maximum possible rectangle dimensions
        let maxWidth = 1;
        let maxHeight = 1;

        // Expand width and height as much as possible
        while (sameTypeColor.some(p =>
            p.x === start.x + maxWidth &&
            p.y === start.y) &&
            start.x + maxWidth < 8) {
            maxWidth++;
        }

        while (sameTypeColor.some(p =>
            p.y === start.y + maxHeight &&
            p.x === start.x) &&
            start.y + maxHeight < 8) {
            maxHeight++;
        }

        // Check all possible rectangles within maxWidth and maxHeight
        for (let w = maxWidth; w >= 2; w--) {
            for (let h = maxHeight; h >= 2; h--) {
                const rectPieces = [];
                let isValidRect = true;

                for (let dx = 0; dx < w; dx++) {
                    for (let dy = 0; dy < h; dy++) {
                        const piece = sameTypeColor.find(p =>
                            p.x === start.x + dx &&
                            p.y === start.y + dy);

                        if (!piece) {
                            isValidRect = false;
                            break;
                        }
                        rectPieces.push(piece);
                    }
                    if (!isValidRect) break;
                }

                if (isValidRect) {
                    rectangles.push({
                        type: start.type,
                        color: start.color,
                        startX: start.x,
                        startY: start.y,
                        width: w,
                        height: h,
                        pieces: rectPieces,
                        efficiency: (w * h) / 4 // Measure of how efficient this rectangle is
                    });

                    rectPieces.forEach(p =>
                        processed.add(`${p.x},${p.y}`));

                    // Once we find a valid rectangle, skip to next start piece
                    break;
                }
            }
            if (processed.has(`${start.x},${start.y}`)) break;
        }
    }

    // Sort rectangles by efficiency
    return rectangles.sort((a, b) => b.efficiency - a.efficiency);
}
function generateRectangleCode(rect) {
    return `// ${rect.width}x${rect.height} rectangle of ${rect.type}s\n` +
           `for(let i = ${rect.startX}; i < ${rect.startX + rect.width}; i++) {\n` +
           `    for(let j = ${rect.startY}; j < ${rect.startY + rect.height}; j++) {\n` +
           `        setupPiece('${rect.type}', '${rect.color}', i, j);\n` +
           `    }\n` +
           `}\n`;
}