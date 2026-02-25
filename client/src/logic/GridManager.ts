import { GRID_SIZE, SHAPE_COLORS } from '../../../shared/constants';

export interface ClearedCellInfo {
    idx: number;
    colorIndex: number;
}

export class GridManager {
    // Each cell stores: 0 = empty, 1–8 = colored block, 9 = garbage
    public grid: Int8Array;
    private dirtyCells: Set<number>;

    constructor() {
        this.grid = new Int8Array(GRID_SIZE * GRID_SIZE);
        this.dirtyCells = new Set();
        this.reset();
    }

    reset() {
        this.grid.fill(0);
        this.markAllDirty();
    }

    public getIndex(row: number, col: number): number {
        return row * GRID_SIZE + col;
    }

    canPlace(shape: number[][], startRow: number, startCol: number): boolean {
        for (const [r, c] of shape) {
            const row = startRow + r;
            const col = startCol + c;
            if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
            if (this.grid[this.getIndex(row, col)] !== 0) return false;
        }
        return true;
    }

    place(
        shape: number[][],
        startRow: number,
        startCol: number,
        shapeType?: string
    ): { clearedLines: number; score: number; clearedCells: ClearedCellInfo[] } {
        if (!this.canPlace(shape, startRow, startCol)) {
            return { clearedLines: 0, score: 0, clearedCells: [] };
        }

        // Determine color index from shape type (default to 1 if unknown)
        const colorIndex = shapeType && SHAPE_COLORS[shapeType] ? SHAPE_COLORS[shapeType] : 1;

        for (const [r, c] of shape) {
            const row = startRow + r;
            const col = startCol + c;
            const idx = this.getIndex(row, col);
            this.grid[idx] = colorIndex as number;
            this.dirtyCells.add(idx);
        }

        return this.checkClear();
    }

    private checkClear(): { clearedLines: number; score: number; clearedCells: ClearedCellInfo[] } {
        const rowsToClear = new Set<number>();
        const colsToClear = new Set<number>();

        for (let r = 0; r < GRID_SIZE; r++) {
            let full = true;
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.grid[this.getIndex(r, c)] === 0) { full = false; break; }
            }
            if (full) rowsToClear.add(r);
        }

        for (let c = 0; c < GRID_SIZE; c++) {
            let full = true;
            for (let r = 0; r < GRID_SIZE; r++) {
                if (this.grid[this.getIndex(r, c)] === 0) { full = false; break; }
            }
            if (full) colsToClear.add(c);
        }

        const indicesToClear = new Set<number>();
        rowsToClear.forEach(r => {
            for (let c = 0; c < GRID_SIZE; c++) indicesToClear.add(this.getIndex(r, c));
        });
        colsToClear.forEach(c => {
            for (let r = 0; r < GRID_SIZE; r++) indicesToClear.add(this.getIndex(r, c));
        });

        // Collect cleared cell info BEFORE clearing
        const clearedCells: ClearedCellInfo[] = [];
        indicesToClear.forEach(idx => {
            clearedCells.push({ idx, colorIndex: this.grid[idx] });
            this.grid[idx] = 0;
            this.dirtyCells.add(idx); // Ensure cleared cells are marked dirty
        });

        const totalStructuresCleared = rowsToClear.size + colsToClear.size;

        // Apply Gravity if any rows were cleared
        if (rowsToClear.size > 0) {
            let writeRow = GRID_SIZE - 1;
            for (let readRow = GRID_SIZE - 1; readRow >= 0; readRow--) {
                if (!rowsToClear.has(readRow)) {
                    if (writeRow !== readRow) {
                        for (let c = 0; c < GRID_SIZE; c++) {
                            const readIdx = this.getIndex(readRow, c);
                            const writeIdx = this.getIndex(writeRow, c);
                            const val = this.grid[readIdx];
                            if (this.grid[writeIdx] !== val) {
                                this.grid[writeIdx] = val;
                                this.dirtyCells.add(writeIdx); // Mark destination as dirty
                            }
                        }
                    }
                    writeRow--;
                }
            }
            // Fill remaining rows at the top with 0
            while (writeRow >= 0) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const writeIdx = this.getIndex(writeRow, c);
                    if (this.grid[writeIdx] !== 0) {
                        this.grid[writeIdx] = 0;
                        this.dirtyCells.add(writeIdx); // Mark old positions as empty
                    }
                }
                writeRow--;
            }
        }

        const score = totalStructuresCleared * 100 + indicesToClear.size * 10;

        return { clearedLines: totalStructuresCleared, score, clearedCells };
    }

    getDirtyCells(): number[] {
        const dirty = Array.from(this.dirtyCells);
        this.dirtyCells.clear();
        return dirty;
    }

    markAllDirty() {
        for (let i = 0; i < this.grid.length; i++) {
            this.dirtyCells.add(i);
        }
    }

    getGridState(): Int8Array {
        return this.grid;
    }

    setGridState(newGrid: Int8Array) {
        this.grid.set(newGrid);
        this.markAllDirty();
    }

    addGarbage(amount: number) {
        let placed = 0;
        let attempts = 0;
        while (placed < amount && attempts < 100) {
            const r = Math.floor(Math.random() * GRID_SIZE);
            const c = Math.floor(Math.random() * GRID_SIZE);
            const idx = this.getIndex(r, c);
            if (this.grid[idx] === 0) {
                this.grid[idx] = 9; // garbage
                this.dirtyCells.add(idx);
                placed++;
            }
            attempts++;
        }
    }

    hasPossibleMoves(shapes: number[][][]): boolean {
        for (const shape of shapes) {
            if (!shape) continue;
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (this.canPlace(shape, r, c)) return true;
                }
            }
        }
        return false;
    }
}
