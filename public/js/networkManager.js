class NetworkManager {
  constructor(gameController) {
    this.socket = io.connect("http://localhost:3000");
    this.gameController = gameController;
    this.color = null;
    this.roomId = null;
    this.lastSyncTurn = 0;
    this.pendingState = null;
    this.waitingForOpponent = true; // NEW
    // Ждем готовности реестра фигур перед установкой обработчиков сокета
    window.Piece.onReady(() => {
      this.setupSocketHandlers();
    });
  }
  isInStartPosition(pieceType, color, x, y) {
    const rank = color === 'white' ? 7 : 0;

    switch (pieceType) {
        case 'rook': return (x === 0 || x === 7) && y === rank;
        case 'knight': return (x === 1 || x === 6) && y === rank;
        case 'bishop': return (x === 2 || x === 5) && y === rank;
        case 'queen': return x === 3 && y === rank;
        case 'king': return x === 4 && y === rank;
        default: return false;
    }
}
handleTopsyTurvyEffect() {
  const pawns = this.gameController.board.getPiecesByType('pawn', 'own');

  // Implement the pawn movement reversal logic
  const newAltMove = function(targetTile, board) {
      const direction = this.color === 'white' ? -1 : 1;
      const isDiagonal = Math.abs(targetTile.x - this.currentTile.x) === 1 &&
                    targetTile.y === this.currentTile.y + direction;
      const isDiagonal2 = Math.abs(targetTile.x - this.currentTile.x) === 2 &&
              targetTile.y === this.currentTile.y + (2*direction);

      if (isDiagonal && !targetTile.occupyingPiece)
          return true;

      if (isDiagonal2 && !board.getTileAt((this.currentTile.x+targetTile.x)/2, this.currentTile.y + direction).occupyingPiece &&
          !targetTile.occupyingPiece && !this.hasMoved)
          return true;

      return false;
  };

  const newAltCapture = function(targetTile, board) {
      const direction = this.color === 'white' ? -1 : 1;

      // Basic one square forward capture
      if (targetTile.x === this.currentTile.x &&
          targetTile.y === this.currentTile.y + direction &&
          targetTile.occupyingPiece) {
              return this.createCaptureResult(true, [targetTile.occupyingPiece]);
      }
      return this.createCaptureResult(false, []);
  };

  // Apply the new movement logic to all pawns
  pawns.forEach(pawn => {
      pawn.isValidAltMove = newAltMove.bind(pawn);
      pawn.isValidAltCapture = newAltCapture.bind(pawn);

      // Set flag to use alternate movement
      pawn.stats.canAltMove = true;
      pawn.stats.canAltCapture = true;
  });

  console.log('Applied Topsy Turvy effect to pawns');
}
  setupSocketHandlers() {
    this.socket.on("connected", (data) => {
      this.color = data.color;
      this.roomId = data.roomId;
      this.gameController.setPlayerColor(this.color);
      this.waitingForOpponent = true; // NEW
      console.log(`Connected as ${this.color} in room ${this.roomId}`);
    });

    this.socket.on("gameStart", (state) => {
      this.waitingForOpponent = false; 
      console.log("Game started, receiving initial state:", state);
      if (window.PieceRegistry.ready) {
        this.applyServerState(state);
      } else {
        console.log("Piece registry not ready, storing state");
        this.pendingState = state;
        window.Piece.onReady(() => {
          if (this.pendingState) {
            console.log("Applying pending state");
            this.applyServerState(this.pendingState);
            this.pendingState = null;
          }
        });
      }
    });

    this.socket.on("moveResponse", (response) => {
      console.log("Received moveResponse:", response);
  
      if (response.status === 0x01) {
          console.log(`Move/card action accepted by server, changes: ${response.changes?.length || 0}`);
  
          // Log each change
          if (response.changes) {
              response.changes.forEach((change, index) => {
                  console.log(`Change ${index}: type=${change.actionType}, tileId=${change.tileId}`);
              });
          }
  
          this.applyServerState(response);
      } else {
          console.log("Move/card action rejected by server");
  
          if (this.gameController.gameState.phase === 'card-selection') {
              // Card action failed, keep the card active
              this.gameController.gameState.updateTileStates();
          } else {
              // Regular move failed
              this.gameController.revertMove();
          }
      }
  });
  }

  sendMove(sourceTile, targetTile, promotion = 0x00) {
    const moveData = new Uint8Array([
      0x01, // Move action
      this.tileToId(sourceTile),
      this.tileToId(targetTile),
      promotion,
    ]);
    this.socket.emit("move", moveData);
  }

  sendCardAction(cardTypeId, selections) {
    console.log(`Sending card action ${cardTypeId} with ${selections.length} selections`);

    // Create binary data for card action
    const data = new Uint8Array(3 + selections.length);
    data[0] = 0x02; // Card action
    data[1] = selections.length;
    data[2] = cardTypeId; // Add card type ID

    // Add selections - make sure we're getting tile IDs correctly
    selections.forEach((tile, index) => {
        data[index + 3] = this.tileToId(tile);
        console.log(`Selection ${index}: tile ${tile.x},${tile.y} -> id ${this.tileToId(tile)}`);
    });

    console.log(`Final card action data: [${Array.from(data).join(', ')}]`);
    this.socket.emit("move", data);
    return true;
}
sendDeclineCard() {
  console.log('Sending decline card message');

  const data = new Uint8Array([0x05]); // Decline Card action

  this.socket.emit("move", data);
  return true;
}
  checkSync() {
    if (this.gameController.gameState.turnNumber !== this.lastSyncTurn) {
      this.requestSync();
    }
  }

  requestSync() {
    this.socket.emit("requestSync");
  }

  idToTileCoords(id) {
    const x = id % 8;
    const y = Math.floor(id / 8);
    console.log(`Converting id ${id} to coords: ${x},${y}`);
    return { x, y };
}

tileToId(tile) {
    const id = tile.y * 8 + tile.x;
    console.log(`Converting tile ${tile.x},${tile.y} to id: ${id}`);
    return id;
}

applyServerState(state) {
  console.log("Applying server state:", state);
  console.log(`Changes: ${state.changes?.length || 0}, turnNumber: ${state.turnNumber}, player: ${state.currentPlayer}`);
  this.lastSyncTurn = state.turnNumber;
  // Check for game over state first
  if (state.gameOver) {
    console.log(`Game Over! Winner: ${state.winner}`);
    this.gameController.gameState.setGameOver(state.winner);
}

  // Apply changes in the correct order
  const removeChanges = state.changes.filter(change => change.actionType === 0x01);
  const addChanges = state.changes.filter(change => change.actionType === 0x02);

  // Track tiles that will receive TopsyTurvy pawns
  const topsyTurvyTiles = new Set();
  if (state.topsyTurvyPawns && Array.isArray(state.topsyTurvyPawns)) {
      state.topsyTurvyPawns.forEach(tileId => topsyTurvyTiles.add(tileId));
      console.log("TopsyTurvy pawns at tile IDs:", Array.from(topsyTurvyTiles));
  }

  console.log(`Remove changes: ${removeChanges.length}, add changes: ${addChanges.length}`);

  // First perform all removals
  removeChanges.forEach(change => {
      const coords = this.idToTileCoords(change.tileId);
      console.log(`Removing piece at: ${coords.x},${coords.y} (tileId: ${change.tileId})`);
      const tile = this.gameController.board.getTileAt(coords.x, coords.y);

      if (!tile) {
          console.error("Invalid tile coordinates:", coords);
          return;
      }

      if (tile.occupyingPiece) {
          console.log('Removing piece:', tile.occupyingPiece.name, tile.occupyingPiece.color);
          tile.occupyingPiece.state = 'dead';
          tile.clear();
      }
  });

  // Then perform all additions
  addChanges.forEach(change => {
      const coords = this.idToTileCoords(change.tileId);
      console.log(`Adding piece at: ${coords.x},${coords.y} (tileId: ${change.tileId})`);
      const tile = this.gameController.board.getTileAt(coords.x, coords.y);

      if (!tile) {
          console.error("Invalid tile coordinates:", coords);
          return;
      }

      // Always clear the tile before adding a new piece to prevent duplicates
      if (tile.occupyingPiece) {
          tile.occupyingPiece.state = 'dead';
          tile.clear();
      }

      const newPiece = this.createPieceFromParameter(change.parameter);
      if (newPiece) {
          console.log('Adding new piece:', newPiece.name, newPiece.color);

          // Check if this tile should have a TopsyTurvy pawn
          if (newPiece.name === 'pawn' && topsyTurvyTiles.has(change.tileId)) {
              console.log(`Making pawn at ${change.tileId} a TopsyTurvy pawn!`);
              newPiece.topsyTurvyActive = true;
          }

          newPiece.spawn(tile);
          this.gameController.board.addPiece(newPiece);
      }
  });

  // Update game state
  this.gameController.gameState.turnNumber = state.turnNumber;
  this.gameController.gameState.currentPlayer = state.currentPlayer;

  // Handle card phase from server
  if (state.cardPhase === 'card-selection' && state.activeCardType) {
      console.log(`Server indicates card phase: ${state.cardPhase}, card type: ${state.activeCardType}, owner: ${state.cardOwner}`);

      // Only create card if it's our turn or we're the owner
      if (state.cardOwner === this.gameController.gameState.playerColor) {
          // Create the appropriate card based on activeCardType
          this.createCardFromType(state.activeCardType);
      } else {
          // We're not the card owner, just update phase
          this.gameController.gameState.phase = 'card-selection';
          this.gameController.gameState.currentCard = null;
          console.log(`Waiting for ${state.cardOwner}'s card selection`);
      }
  } else {
      // No card active
      this.gameController.gameState.phase = 'normal';
      this.gameController.gameState.currentCard = null;
  }

  // Update graveyards
  if (this.gameController.whiteGraveyard) {
      this.gameController.whiteGraveyard.updateDeadPieces(this.gameController.board);
  }
  if (this.gameController.blackGraveyard) {
      this.gameController.blackGraveyard.updateDeadPieces(this.gameController.board);
  }

  console.log("State applied, current player:", this.gameController.gameState.currentPlayer);
}


createCardFromType(cardTypeId) {
  console.log(`Creating card from type ID: ${cardTypeId}`);
  let CardClass;

  // Map card type ID to card class
  switch(cardTypeId) {
      case 1: CardClass = OnslaughtCard; break;
      case 2: CardClass = PolymorphCard; break;
      case 3: CardClass = BizarreMutationCard; break;
      case 4: CardClass = DraughtCard; break;
      case 5: CardClass = TelekinesisCard; break;
      case 6: CardClass = TopsyTurvyCard; break;
      default:
          console.error(`Unknown card type ID: ${cardTypeId}`);
          return;
  }

  try {
      // Create the card
      const card = new CardClass(this.gameController.board);
      card.reset();
      card.determineSelectables();

      // Set in game state
      this.gameController.gameState.currentCard = card;
      this.gameController.gameState.phase = 'card-selection';

      console.log(`Card created: ${card.name}`);
  } catch (e) {
      console.error('Error creating card:', e);
  }
}

  createPieceFromParameter(param) {
    try {
      const color = param < 0x10 ? "white" : "black";
      const typeParam = param & 0x0f;
      const pieceTypes = {
        0x01: "pawn",
        0x02: "rook",
        0x03: "knight",
        0x04: "bishop",
        0x05: "queen",
        0x06: "king",
        0x07: "jumper",
        0x08: "ogre",
      };

      const pieceName = pieceTypes[typeParam];
      if (!pieceName) {
        console.error("Unknown piece type parameter:", typeParam);
        return null;
      }

      console.log("Creating piece:", pieceName, color);
      return window.Piece.createPiece(pieceName, color);
    } catch (e) {
      console.error("Error creating piece:", e);
      return null;
    }
  }
}
