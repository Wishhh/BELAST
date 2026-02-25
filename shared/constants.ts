export const GRID_SIZE = 9;
export const SUBGRID_SIZE = 3; // 3x3 subgrids
export const TILE_SIZE = 40; // Pixel size for rendering reference
export const BOARD_PIXEL_SIZE = GRID_SIZE * TILE_SIZE;

// Tetromino-ish definitions (Standard Blockudoku/Woodoku shapes usually)
// Represented as arrays of coordinates [row, col] relative to an anchor (0,0) usually top-left or center.
// For simplicity, let's use a 0/1 grid or coordinate list. Coordinate list is easier for pooling/rendering.
export const SHAPES = {
    // Single block
    SINGLE: [[0, 0]],

    // 2-blocks
    DOMINO_H: [[0, 0], [0, 1]],
    DOMINO_V: [[0, 0], [1, 0]],

    // 3-blocks
    TRIO_H: [[0, 0], [0, 1], [0, 2]],
    TRIO_V: [[0, 0], [1, 0], [2, 0]],
    CORNER_TL: [[0, 0], [0, 1], [1, 0]], // Top-Left corner style

    // 4-blocks
    TETRIS_L: [[0, 0], [1, 0], [2, 0], [2, 1]],
    TETRIS_T: [[0, 0], [0, 1], [0, 2], [1, 1]],
    SQUARE: [[0, 0], [0, 1], [1, 0], [1, 1]],

    // 5-blocks
    // Add more as needed
};

// 8 distinct piece colors (index 1–8). Index 0 = empty, index 9 = garbage.
export const PIECE_COLORS: Record<number, string> = {
    1: '#E74C3C', // Red
    2: '#E67E22', // Orange
    3: '#F1C40F', // Yellow
    4: '#2ECC71', // Green
    5: '#1ABC9C', // Teal
    6: '#3498DB', // Blue
    7: '#9B59B6', // Purple
    8: '#E91E8C', // Pink
    9: '#9E9E9E', // Garbage (grey)
};

// Maps each shape type to a fixed color index (1–8)
export const SHAPE_COLORS: Record<string, number> = {
    SINGLE:    1,
    DOMINO_H:  2,
    DOMINO_V:  3,
    TRIO_H:    4,
    TRIO_V:    5,
    CORNER_TL: 6,
    TETRIS_L:  7,
    TETRIS_T:  8,
    SQUARE:    1,
};

// Clear effect types — one per color index
export type ClearEffect =
    | 'flash'       // 1 – bright white flash
    | 'shatter'     // 2 – explode outward
    | 'melt'        // 3 – drip downward
    | 'pulse'       // 4 – scale pulse
    | 'ripple'      // 5 – concentric ring
    | 'spark'       // 6 – particle sparks
    | 'dissolve'    // 7 – fade with noise
    | 'sweep';      // 8 – horizontal sweep wipe

export const COLOR_CLEAR_EFFECT: Record<number, ClearEffect> = {
    1: 'flash',
    2: 'shatter',
    3: 'melt',
    4: 'pulse',
    5: 'ripple',
    6: 'spark',
    7: 'dissolve',
    8: 'sweep',
    9: 'flash',
};

export const GAME_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    FIND_MATCH: 'find_match',
    MATCH_FOUND: 'match_found',
    PLAYER_MOVE: 'player_move', // Sent when a player places a block
    GAME_UPDATE: 'game_update', // Server sending updates (garbage, etc)
    GAME_OVER: 'game_over'
};
