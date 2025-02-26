// sketch.js
let board;
let tileSize;
let gameController;
let cardImage;
let drawManager;
let whiteGraveyard;
let blackGraveyard;

function preload() {
    cardImage = loadImage("assets/example.png");
}

function setup() {
    createCanvas(1000, 800);

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
    if (!drawManager) return; // Добавляем проверку

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

