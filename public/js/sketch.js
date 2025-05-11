// sketch.js
let board;
let tileSize;
let gameController;
let cardImage;
let drawManager;
let whiteGraveyard;
let blackGraveyard;

let cardImages = {};

function preload() {
    // Load card images
    cardImages = {
        default: loadImage("assets/example.png"),
        polymorph: loadImage("assets/polymorph.png"),
        onslaught: loadImage("assets/onslaught.png"),
        bizarremutation: loadImage("assets/bizarremutation.png"),
        draught: loadImage("assets/draught.png"),
        telekinesis: loadImage("assets/telekinesis.png"),
        topsyTurvy: loadImage("assets/topsyturvy.png")
    };
}

function setup() {
    createCanvas(1000, 800);
    // Make card images available globally
    window.cardImages = cardImages;

    // Proactively create the card manager
    window.CardManager = CardManager;

    // Проверяем, что все необходимые классы загружены
    if (!window.Board || !window.Piece) {
        console.error('Required classes are not loaded');
        return;
    }

    // Инициализируем все компоненты
    try {
        board = new window.Board();
        tileSize = 800 / 8;

        // Создаем drawManager до его использования
        drawManager = new DrawManager();

        whiteGraveyard = new Graveyard('white', 810, 400, 180, 390);
        blackGraveyard = new Graveyard('black', 810, 10, 180, 390);

        gameController = new GameController(board);
        board.gameState = gameController.gameState;
    } catch (e) {
        console.error('Setup error:', e);
    }
}

function draw() {
    if (!drawManager) return;

    background(220);

    // Draw board
    drawManager.drawBoard(board.getState());

    // Draw graveyards
    drawManager.drawGraveyard(whiteGraveyard.getState());
    drawManager.drawGraveyard(blackGraveyard.getState());

    // Log game phase for debugging
    if (gameController && gameController.gameState) {
        // Only log when it changes to avoid console spam
        if (window.lastPhase !== gameController.gameState.phase) {
            console.log("Current game phase:", gameController.gameState.phase);
            window.lastPhase = gameController.gameState.phase;
        }
    }

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
    if (uiState.gameOverState) {
        drawManager.drawGameOver(uiState.gameOverState);
    }
    // Debug overlay for card state
    if (gameController && gameController.gameState) {
        fill(0);
        textSize(14);
        textAlign(LEFT, TOP);
        text(`Phase: ${gameController.gameState.phase}`, 10, 10);
        text(`Card: ${gameController.gameState.currentCard?.name || 'none'}`, 10, 30);
    }

    // Extra debug for card drawing
    if (gameController && gameController.gameState &&
        gameController.gameState.currentCard) {

        // Force draw card directly for debugging
        const cardState = gameController.gameState.currentCard.getState();
        fill(255, 0, 0);
        stroke(255, 0, 0);
        strokeWeight(2);
        rect(cardState.x, cardState.y, 10, 10); // Small red square to mark card position
    }
}

function mousePressed() {
    if (gameController) {
        gameController.mousePressed(mouseX, mouseY);
    }
}

function mouseDragged() {
    if (gameController) {
        gameController.mouseDragged(mouseX, mouseY);
    }
}

function mouseReleased() {
    if (gameController) {
        gameController.mouseReleased(mouseX, mouseY);
    }
}
function keyPressed() {
    if (key === 'c' || key === 'C') {
        console.log("Forcing card display");
        gameController.gameState.forceShowCard();
    }
}

