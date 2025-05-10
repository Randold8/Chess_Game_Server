(function(global) {
    const PieceLogic = {
        pawn: {
            isValidMove: function(piece, targetTile, board) {
                const direction = piece.color === 'white' ? -1 : 1;

                // Basic one square forward movement
                if (targetTile.x === piece.currentTile.x &&
                    targetTile.y === piece.currentTile.y + direction &&
                    !targetTile.occupyingPiece) {
                    return true;
                }

                // Initial two square movement
                if (!piece.hasMoved &&
                    targetTile.x === piece.currentTile.x &&
                    targetTile.y === piece.currentTile.y + (2 * direction) &&
                    !targetTile.occupyingPiece &&
                    !board.getTileAt(piece.currentTile.x, piece.currentTile.y + direction).occupyingPiece) {
                    return true;
                }

                return false;
            },
            isValidCapture: function(piece, targetTile, board) {
                const direction = piece.color === 'white' ? -1 : 1;
                const isDiagonal = Math.abs(targetTile.x - piece.currentTile.x) === 1 &&
                                  targetTile.y === piece.currentTile.y + direction;

                if (isDiagonal &&
                    targetTile.occupyingPiece &&
                    targetTile.occupyingPiece.color !== piece.color) {
                    return { isValid: true, capturedPieces: [targetTile.occupyingPiece] };
                }

                return { isValid: false, capturedPieces: [] };
            }
        },
        rook: {
            isValidMove: function(piece, targetTile, board) {
                if (targetTile.occupyingPiece) return false;
                return piece.isStraightMove(targetTile) && piece.isPathClear(targetTile, board);
            },
            isValidCapture: function(piece, targetTile, board) {
                if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === piece.color) {
                    return { isValid: false, capturedPieces: [] };
                }
                if (piece.isStraightMove(targetTile) && piece.isPathClear(targetTile, board)) {
                    return { isValid: true, capturedPieces: [targetTile.occupyingPiece] };
                }
                return { isValid: false, capturedPieces: [] };
            }
        },
        knight: {
            isValidMove: function(piece, targetTile, board) {
                if (targetTile.occupyingPiece) return false;
                return piece.isKnightMove(targetTile);
            },
            isValidCapture: function(piece, targetTile, board) {
                if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === piece.color) {
                    return { isValid: false, capturedPieces: [] };
                }
                if (piece.isKnightMove(targetTile)) {
                    return { isValid: true, capturedPieces: [targetTile.occupyingPiece] };
                }
                return { isValid: false, capturedPieces: [] };
            }
        },
        bishop: {
            isValidMove: function(piece, targetTile, board) {
                if (targetTile.occupyingPiece) return false;
                return piece.isDiagonalMove(targetTile) && piece.isPathClear(targetTile, board);
            },
            isValidCapture: function(piece, targetTile, board) {
                if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === piece.color) {
                    return { isValid: false, capturedPieces: [] };
                }
                if (piece.isDiagonalMove(targetTile) && piece.isPathClear(targetTile, board)) {
                    return { isValid: true, capturedPieces: [targetTile.occupyingPiece] };
                }
                return { isValid: false, capturedPieces: [] };
            }
        },
        queen: {
            isValidMove: function(piece, targetTile, board) {
                if (targetTile.occupyingPiece) return false;
                return (piece.isDiagonalMove(targetTile) || piece.isStraightMove(targetTile)) &&
                       piece.isPathClear(targetTile, board);
            },
            isValidCapture: function(piece, targetTile, board) {
                if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === piece.color) {
                    return { isValid: false, capturedPieces: [] };
                }
                if ((piece.isDiagonalMove(targetTile) || piece.isStraightMove(targetTile)) &&
                    piece.isPathClear(targetTile, board)) {
                    return { isValid: true, capturedPieces: [targetTile.occupyingPiece] };
                }
                return { isValid: false, capturedPieces: [] };
            }
        },
        king: {
            isValidMove: function(piece, targetTile, board) {
                if (targetTile.occupyingPiece) return false;
                const dx = Math.abs(targetTile.x - piece.currentTile.x);
                const dy = Math.abs(targetTile.y - piece.currentTile.y);
                return dx <= 1 && dy <= 1;
            },
            isValidCapture: function(piece, targetTile, board) {
                if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === piece.color) {
                    return { isValid: false, capturedPieces: [] };
                }
                const dx = Math.abs(targetTile.x - piece.currentTile.x);
                const dy = Math.abs(targetTile.y - piece.currentTile.y);
                if (dx <= 1 && dy <= 1) {
                    return { isValid: true, capturedPieces: [targetTile.occupyingPiece] };
                }
                return { isValid: false, capturedPieces: [] };
            }
        },
        jumper: {
            isValidMove: function(piece, targetTile, board) {
                if (targetTile.occupyingPiece) return false;
                const dx = targetTile.x - piece.currentTile.x;
                const dy = targetTile.y - piece.currentTile.y;
                const direction = piece.color === 'white' ? -1 : 1;
                return Math.abs(dx) === 1 && dy === direction;
            },
            isValidCapture: function(piece, targetTile, board) {
                // For jumper captures, the target tile must be empty
                if (targetTile.occupyingPiece) return { isValid: false, capturedPieces: [] };
        
                const dx = targetTile.x - piece.currentTile.x;
                const dy = targetTile.y - piece.currentTile.y;
        
                // Must move exactly two squares diagonally
                if (Math.abs(dx) !== 2 || Math.abs(dy) !== 2) {
                    return { isValid: false, capturedPieces: [] };
                }
        
                // Calculate the position of the piece being jumped over
                const midX = piece.currentTile.x + dx/2;
                const midY = piece.currentTile.y + dy/2;
        
                // Check the piece being jumped over
                const jumpedTile = board.getTileAt(midX, midY);
                if (!jumpedTile || !jumpedTile.occupyingPiece ||
                    jumpedTile.occupyingPiece.color === piece.color) {
                    return { isValid: false, capturedPieces: [] };
                }
        
                return { isValid: true, capturedPieces: [jumpedTile.occupyingPiece] };
            }
        },
        
        ogre: {
            isValidMove: function(piece, targetTile, board) {
                if (targetTile.occupyingPiece) return false;
                const dx = Math.abs(targetTile.x - piece.currentTile.x);
                const dy = Math.abs(targetTile.y - piece.currentTile.y);
                return (dx === 2 && dy === 0) || (dx === 0 && dy === 2);
            },
            isValidCapture: function(piece, targetTile, board) {
                if (!targetTile.occupyingPiece || targetTile.occupyingPiece.color === piece.color) {
                    return { isValid: false, capturedPieces: [] };
                }
                const dx = Math.abs(targetTile.x - piece.currentTile.x);
                const dy = Math.abs(targetTile.y - piece.currentTile.y);
                if ((dx === 2 && dy === 0) || (dx === 0 && dy === 2)) {
                    return { isValid: true, capturedPieces: [targetTile.occupyingPiece] };
                }
                return { isValid: false, capturedPieces: [] };
            }
        },
        topsyTurvyPawn: {
            // For server-side validation of Topsy-Turvy pawns
            isValidMove: function(piece, targetTile, board) {
                const direction = piece.color === 'white' ? -1 : 1;
    
                // Diagonal movement
                const isDiagonal = Math.abs(targetTile.x - piece.currentTile.x) === 1 &&
                                targetTile.y === piece.currentTile.y + direction;
    
                if (isDiagonal && !targetTile.occupyingPiece) {
                    return true;
                }
    
                // Two-square diagonal jump (if pawn hasn't moved yet)
                const isDiagonal2 = !piece.hasMoved &&
                            Math.abs(targetTile.x - piece.currentTile.x) === 2 &&
                            targetTile.y === piece.currentTile.y + (2 * direction);
    
                if (isDiagonal2 && !targetTile.occupyingPiece) {
                    // Check the intermediate tile
                    const midX = (piece.currentTile.x + targetTile.x) / 2;
                    const midY = piece.currentTile.y + direction;
                    const midTile = board.getTileAt(midX, midY);
    
                    if (midTile && !midTile.occupyingPiece) {
                        return true;
                    }
                }
    
                return false;
            },
    
            isValidCapture: function(piece, targetTile, board) {
                const direction = piece.color === 'white' ? -1 : 1;
    
                // Forward capture
                if (targetTile.x === piece.currentTile.x &&
                    targetTile.y === piece.currentTile.y + direction &&
                    targetTile.occupyingPiece &&
                    targetTile.occupyingPiece.color !== piece.color) {
                    return { isValid: true, capturedPieces: [targetTile.occupyingPiece] };
                }
    
                return { isValid: false, capturedPieces: [] };
            }
        }
    };

    if (typeof window === 'undefined') {
        // Серверная часть
        module.exports = { PieceLogic };
    } else {
        // Клиентская часть
        window.PieceLogic = PieceLogic;
    }
})(typeof window !== 'undefined' ? window : global);