// cardEffects.js (server-side)
class CardEffect {
    static executeEffect(cardType, selections, board, currentPlayer, changes) {
        console.log(`CardEffect.executeEffect: type=${cardType}, player=${currentPlayer}, selections=${selections}`);

        let result = false;

        try {
            switch(cardType) {
                case 1: result = this.onslaughtCard(selections, board, currentPlayer, changes); break;
                case 2: result = this.polymorphCard(selections, board, currentPlayer, changes); break;
                case 3: result = this.bizarreMutationCard(selections, board, currentPlayer, changes); break;
                case 4: result = this.draughtCard(selections, board, currentPlayer, changes); break;
                case 5: result = this.telekinesisCard(selections, board, currentPlayer, changes); break;
                case 6: result = this.topsyTurvyCard(selections, board, currentPlayer, changes); break;
                default:
                    console.error(`Unknown card type ID: ${cardType}`);
                    return false;
            }
        } catch (e) {
            console.error("Error executing card effect:", e);
            return false;
        }

        console.log(`CardEffect.executeEffect result: ${result}, changes: ${changes.length}`);
        return result;
    }

    static onslaughtCard(selections, board, currentPlayer, changes) {
        console.log("Executing Onslaught Card");
        let success = false;

        // Move up to three pawns forward
        for (let i = 0; i < selections.length && i < 3; i++) {
            const tileId = selections[i];
            const coords = this.idToTileCoords(tileId);
            const tile = board.getTileAt(coords.x, coords.y);

            if (!tile || !tile.occupyingPiece ||
                tile.occupyingPiece.name !== 'pawn' ||
                tile.occupyingPiece.color !== currentPlayer) {
                continue;
            }

            const direction = currentPlayer === 'white' ? -1 : 1;
            const forwardTile = board.getTileAt(coords.x, coords.y + direction);

            if (!forwardTile || forwardTile.occupyingPiece) {
                continue;
            }

            // Move the pawn
            const pawn = tile.occupyingPiece;

            // Remove from current tile
            tile.clear();
            changes.push({
                tileId: tileId,
                actionType: 0x01, // Remove piece
                reason: 0x05 // Card effect
            });

            // Add to new tile
            pawn.spawn(forwardTile);
            const forwardTileId = this.tileToId(forwardTile);
            changes.push({
                tileId: forwardTileId,
                actionType: 0x02, // Add piece
                parameter: this.getPieceParameter(pawn),
                reason: 0x05 // Card effect
            });

            success = true;
        }

        return success;
    }

    static polymorphCard(selections, board, currentPlayer, changes) {
        console.log("Executing Polymorph Card");
        if (selections.length !== 1) return false;

        const tileId = selections[0];
        const coords = this.idToTileCoords(tileId);
        const tile = board.getTileAt(coords.x, coords.y);

        if (!tile || !tile.occupyingPiece) return false;

        const piece = tile.occupyingPiece;
        if (piece.name !== 'bishop' && piece.name !== 'rook') return false;

        const pieceColor = piece.color;

        // Remove the original piece
        tile.clear();
        changes.push({
            tileId: tileId,
            actionType: 0x01, // Remove piece
            reason: 0x05 // Card effect
        });

        // Create a knight
        const knight = this.createPiece('knight', pieceColor);
        knight.spawn(tile);
        changes.push({
            tileId: tileId,
            actionType: 0x02, // Add piece
            parameter: this.getPieceParameter(knight),
            reason: 0x05 // Card effect
        });

        return true;
    }

    static bizarreMutationCard(selections, board, currentPlayer, changes) {
        console.log("Executing Bizarre Mutation Card");
        if (selections.length !== 1) return false;

        const tileId = selections[0];
        const coords = this.idToTileCoords(tileId);
        const tile = board.getTileAt(coords.x, coords.y);

        if (!tile || !tile.occupyingPiece || tile.occupyingPiece.name !== 'pawn') {
            return false;
        }

        const pieceColor = tile.occupyingPiece.color;

        // Remove the pawn
        tile.clear();
        changes.push({
            tileId: tileId,
            actionType: 0x01, // Remove piece
            reason: 0x05 // Card effect
        });

        // Create a jumper
        const jumper = this.createPiece('jumper', pieceColor);
        jumper.spawn(tile);
        changes.push({
            tileId: tileId,
            actionType: 0x02, // Add piece
            parameter: this.getPieceParameter(jumper),
            reason: 0x05 // Card effect
        });

        return true;
    }

    static draughtCard(selections, board, currentPlayer, changes) {
        console.log("Executing Draught Card");
        if (selections.length !== 1) return false;

        const tileId = selections[0];
        const coords = this.idToTileCoords(tileId);
        const tile = board.getTileAt(coords.x, coords.y);

        if (!tile || !tile.occupyingPiece) return false;

        const piece = tile.occupyingPiece;
        if (piece.name !== 'rook' && piece.name !== 'bishop' && piece.name !== 'knight') {
            return false;
        }

        const pieceColor = piece.color;

        // Remove the original piece
        tile.clear();
        changes.push({
            tileId: tileId,
            actionType: 0x01, // Remove piece
            reason: 0x05 // Card effect
        });

        // Create a jumper
        const jumper = this.createPiece('jumper', pieceColor);
        jumper.spawn(tile);
        changes.push({
            tileId: tileId,
            actionType: 0x02, // Add piece
            parameter: this.getPieceParameter(jumper),
            reason: 0x05 // Card effect
        });

        return true;
    }

    static telekinesisCard(selections, board, currentPlayer, changes) {
        console.log("Executing Telekinesis Card");
        if (selections.length !== 2) return false;

        const pawnTileId = selections[0];
        const targetTileId = selections[1];

        const pawnCoords = this.idToTileCoords(pawnTileId);
        const targetCoords = this.idToTileCoords(targetTileId);

        const pawnTile = board.getTileAt(pawnCoords.x, pawnCoords.y);
        const targetTile = board.getTileAt(targetCoords.x, targetCoords.y);

        if (!pawnTile || !targetTile || !pawnTile.occupyingPiece) {
            console.log("Invalid tiles or no piece on source tile");
            return false;
        }

        // Verify it's an enemy pawn
        const piece = pawnTile.occupyingPiece;
        if (piece.name !== 'pawn' || piece.color === currentPlayer) {
            console.log("Not an enemy pawn");
            return false;
        }

        // Check if target tile is empty and adjacent in a cardinal direction
        if (targetTile.occupyingPiece) {
            console.log("Target tile is occupied");
            return false;
        }

        const dx = Math.abs(targetCoords.x - pawnCoords.x);
        const dy = Math.abs(targetCoords.y - pawnCoords.y);

        if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) {
            console.log("Not a cardinal direction");
            return false;
        }

        // Move the pawn
        pawnTile.clear();
        changes.push({
            tileId: pawnTileId,
            actionType: 0x01, // Remove piece
            reason: 0x05 // Card effect
        });

        piece.spawn(targetTile);
        changes.push({
            tileId: targetTileId,
            actionType: 0x02, // Add piece
            parameter: this.getPieceParameter(piece),
            reason: 0x05 // Card effect
        });

        return true;
    }

    static topsyTurvyCard(selections, board, currentPlayer, changes) {
        console.log("Executing Topsy Turvy Card");
        if (selections.length === 0) return false;
    
        let success = false;
    
        // For each selected pawn
        for (const tileId of selections) {
            const coords = this.idToTileCoords(tileId);
            const tile = board.getTileAt(coords.x, coords.y);
    
            // Ensure it's the player's pawn
            if (!tile || !tile.occupyingPiece ||
                tile.occupyingPiece.name !== 'pawn' ||
                tile.occupyingPiece.color !== currentPlayer) {
                continue;
            }
    
            // We'll "remove" the pawn and re-add it with a marker
            // This ensures the state properly propagates to clients
    
            // Get current pawn data
            const pawn = tile.occupyingPiece;
    
            // Remove the pawn
            tile.clear();
            changes.push({
                tileId: tileId,
                actionType: 0x01, // Remove piece
                reason: 0x05 // Card effect
            });
    
            // Add the pawn back (this will get the topsyTurvyActive flag on client)
            pawn.spawn(tile);
            changes.push({
                tileId: tileId,
                actionType: 0x02, // Add piece
                parameter: this.getPieceParameter(pawn),
                reason: 0x05, // Card effect
                // The client will check state.topsyTurvyPawns to add the flag
            });
    
            success = true;
        }
    
        return success;
    }
      

    // Helper methods
    static idToTileCoords(id) {
        const x = id % 8;
        const y = Math.floor(id / 8);
        console.log(`CardEffect: Converting ID ${id} to coords ${x},${y}`);
        return { x, y };
    }
    
    static tileToId(tile) {
        const id = tile.y * 8 + tile.x;
        console.log(`CardEffect: Converting tile ${tile.x},${tile.y} to ID ${id}`);
        return id;
    }

    static getPieceParameter(piece) {
        const pieceTypes = {
            'pawn': 0x01,
            'rook': 0x02,
            'knight': 0x03,
            'bishop': 0x04,
            'queen': 0x05,
            'king': 0x06,
            'jumper': 0x07,
            'ogre': 0x08
        };
    
        const param = piece.color === 'white' ?
            pieceTypes[piece.name] :
            pieceTypes[piece.name] + 0x10;
    
        console.log(`CardEffect: Getting parameter for ${piece.color} ${piece.name}: ${param.toString(16)}`);
        return param;
    }

    static createPiece(name, color) {
        console.log(`CardEffect: Creating piece ${color} ${name}`);
        const { Piece } = require('./shared/gameClasses');
        const piece = Piece.createPiece(name, color);
        console.log(`CardEffect: Created piece successfully: ${piece.name}, ${piece.color}`);
        return piece;
    }
}

module.exports = CardEffect;
