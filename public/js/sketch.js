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

        whiteGraveyard = new Graveyard('white', 825, 400, 150, 200);
        blackGraveyard = new Graveyard('black', 825, 180, 150, 200);

        gameController = new GameController(board);
        board.gameState = gameController.gameState;
        
        // Add graveyards to gameController
        gameController.whiteGraveyard = whiteGraveyard;
        gameController.blackGraveyard = blackGraveyard;
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
        textSize(16);
        const rightX = 820; // right-hand sidebar starting location
        let y = 20;
        textAlign(LEFT, TOP);
    
        // Player color
        fill(0);
        const playerColor = gameController.gameState.playerColor
            ? (gameController.gameState.playerColor.charAt(0).toUpperCase() + gameController.gameState.playerColor.slice(1))
            : 'Unknown';
        text(`You are: ${playerColor}`, rightX, y); y += 26;
    
        // Turn info
        let turnText, turnColor;
        if (gameController.gameState.playerColor === gameController.gameState.currentPlayer) {
            turnText = 'Turn: Your Turn';
            turnColor = color(0, 150, 0); // green
        } else {
            turnText = 'Turn: Enemy Turn';
            turnColor = color(200, 0, 0); // red
        }
        fill(turnColor);
        text(turnText, rightX, y); y += 26;
    
        // Phase and Card
        fill(0);
        text(`Phase: ${gameController.gameState.phase}`, rightX, y); y += 22;
        text(`Card: ${gameController.gameState.currentCard?.name || 'none'}`, rightX, y); y += 22;
    }
    
    
    if (gameController &&
        gameController.networkManager &&
        gameController.networkManager.waitingForOpponent) {
        push();
        fill(0, 0, 0, 160);
        rect(0, 0, width, height);
        textAlign(CENTER, CENTER);
        textSize(36);
        fill(255);
        text("Waiting for another player to join your room...", width/2, height/2);
        pop();
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

