(function(global) {
    const Utils = typeof window !== 'undefined' ? window.Utils : require('./utils');
    const PieceLogic = Utils.isNode ? require('./pieceLogic').PieceLogic : global.PieceLogic;

    // Добавим проверку
    if (!PieceLogic) {
        throw new Error('PieceLogic is not defined');
    }

    console.log('Available piece types in PieceLogic:', Object.keys(PieceLogic));
    const Tile = class {
        constructor(x, y, board) {
            this.x = x;
            this.y = y;
            this.type = 'normal';
            this.state = 'normal';
            this.occupyingPiece = null;
            this.board = board;
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
    };

    const Board = class {
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

            const newPiece = Piece.createPiece(newPieceName, piece.color);

            const currentTile = piece.currentTile;
            if (!currentTile) return false;

            currentTile.clear();
            piece.state = 'dead';

            newPiece.spawn(currentTile);

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
                    tiles.push(new Tile(x, y, this));
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
    };

    const Piece = class {
        constructor(name, color) {
            this.name = name;
            this.color = color;
            this.currentTile = null;
            this.hasMoved = false;
            this.hasDoubleMoved = false;
            this.state = 'alive';
            this.stats = {
                canMove: true,
                canAltMove: true,
                canCapture: true,
                canAltCapture: true
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

        createCaptureResult(isValid, capturedPieces = []) {
            return {
                isValid: isValid,
                capturedPieces: capturedPieces
            };
        }

        isPathClear(targetTile, board) {
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

        isValidMove(targetTile, board) {
            const logic = PieceLogic[this.name.toLowerCase()];
            if (!logic) return false;
            return logic.isValidMove(this, targetTile, board);
        }

        isValidCapture(targetTile, board) {
            const logic = PieceLogic[this.name.toLowerCase()];
            if (!logic) return { isValid: false, capturedPieces: [] };
            return logic.isValidCapture(this, targetTile, board);
        }

        isValidAltMove(targetTile, board) {
            return false;
        }

        isValidAltCapture(targetTile, board) {
            return this.createCaptureResult(false);
        }

        isDiagonalMove(targetTile) {
            const dx = Math.abs(targetTile.x - this.currentTile.x);
            const dy = Math.abs(targetTile.y - this.currentTile.y);
            return dx === dy;
        }

        isStraightMove(targetTile) {
            return targetTile.x === this.currentTile.x ||
                   targetTile.y === this.currentTile.y;
        }

        isKnightMove(targetTile) {
            const dx = Math.abs(targetTile.x - this.currentTile.x);
            const dy = Math.abs(targetTile.y - this.currentTile.y);
            return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
        }

        getMovementDirection() {
            return this.color === 'white' ? -1 : 1;
        }
    };

    // Определяем статические методы для Piece
    if (Utils.isNode) {
        // Серверная версия createPiece
        Piece.createPiece = function(name, color) {
            return new Piece(name, color);
        };
    } else {
        // Клиентская версия
        global.PieceRegistry = {
            pieces: {},
            ready: false,
            onReadyCallbacks: []
        };

        Piece.registerPieceType = function(name, constructor) {
            global.PieceRegistry.pieces[name.toLowerCase()] = constructor;
        };

        Piece.setReady = function() {
            global.PieceRegistry.ready = true;
            global.PieceRegistry.onReadyCallbacks.forEach(callback => callback());
            global.PieceRegistry.onReadyCallbacks = [];
        };

        Piece.onReady = function(callback) {
            if (global.PieceRegistry.ready) {
                callback();
            } else {
                global.PieceRegistry.onReadyCallbacks.push(callback);
            }
        };

        Piece.createPiece = function(name, color) {
            if (!global.PieceRegistry.ready) {
                throw new Error('Piece registry is not ready');
            }
            const Constructor = global.PieceRegistry.pieces[name.toLowerCase()];
            if (!Constructor) {
                throw new Error(`Invalid piece type: ${name}`);
            }
            return new Constructor(color);
        };
    }

    if (Utils.isNode) {
        module.exports = { Board, Tile, Piece };
    } else {
        global.Board = Board;
        global.Tile = Tile;
        global.Piece = Piece;
    }
})(typeof window !== 'undefined' ? window : global);