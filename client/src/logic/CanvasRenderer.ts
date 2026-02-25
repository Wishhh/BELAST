import { GridManager } from './GridManager';
import type { ClearedCellInfo } from './GridManager';
import { GRID_SIZE, PIECE_COLORS, COLOR_CLEAR_EFFECT } from '../../../shared/constants';
import type { ClearEffect } from '../../../shared/constants';

// Local fallback color table — guards against any HMR/import timing issues
const CELL_COLORS: string[] = [
    '',          // 0 = empty
    '#E74C3C',   // 1 = Red      (SINGLE)
    '#E67E22',   // 2 = Orange   (DOMINO_H)
    '#F1C40F',   // 3 = Yellow   (DOMINO_V)
    '#2ECC71',   // 4 = Green    (TRIO_H)
    '#1ABC9C',   // 5 = Teal     (TRIO_V)
    '#3498DB',   // 6 = Blue     (CORNER_TL)
    '#9B59B6',   // 7 = Purple   (TETRIS_L)
    '#E91E8C',   // 8 = Pink     (TETRIS_T)
    '#9E9E9E',   // 9 = Garbage
];

interface ActiveAnimation {
    cells: ClearedCellInfo[];
    effect: ClearEffect;
    startTime: number;
    duration: number;
    rafId?: number;
}

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private width: number;
    private height: number;
    private tileSize: number;
    private activeAnimations: ActiveAnimation[] = [];

    constructor(ctx: CanvasRenderingContext2D, width: number, height: number, tileSize: number) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
    }

    drawGrid(gridManager: GridManager) {
        // Fill entire board with dark background (fully opaque)
        this.ctx.fillStyle = '#0f162d';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const grid = gridManager.grid;
        for (let i = 0; i < grid.length; i++) {
            const row = Math.floor(i / GRID_SIZE);
            const col = i % GRID_SIZE;
            this.drawCell(row, col, grid[i]);
        }
    }

    drawDirty(gridManager: GridManager) {
        const dirtyIndices = gridManager.getDirtyCells();
        if (dirtyIndices.length === 0) return;
        for (const idx of dirtyIndices) {
            const row = Math.floor(idx / GRID_SIZE);
            const col = idx % GRID_SIZE;
            this.drawCell(row, col, gridManager.grid[idx]);
        }
    }

    // Called after a clear — groups cells by dominant color and launches per-color animations
    playClearAnimation(clearedCells: ClearedCellInfo[], gridManager: GridManager, onDone?: () => void) {
        if (clearedCells.length === 0) {
            onDone?.();
            return;
        }

        // Group cells by color index
        const byColor = new Map<number, ClearedCellInfo[]>();
        for (const cell of clearedCells) {
            const ci = cell.colorIndex || 1;
            if (!byColor.has(ci)) byColor.set(ci, []);
            byColor.get(ci)!.push(cell);
        }

        let pending = byColor.size;
        const finish = () => {
            pending--;
            if (pending === 0) onDone?.();
        };

        byColor.forEach((cells, colorIndex) => {
            const effect = COLOR_CLEAR_EFFECT[colorIndex] ?? 'flash';
            this.runEffect(cells, colorIndex, effect, gridManager, finish);
        });
    }

    private runEffect(
        cells: ClearedCellInfo[],
        _colorIndex: number,
        effect: ClearEffect,
        gridManager: GridManager,
        onDone: () => void
    ) {
        const DURATION: Record<ClearEffect, number> = {
            flash: 300,
            shatter: 500,
            melt: 450,
            pulse: 400,
            ripple: 500,
            spark: 550,
            dissolve: 400,
            sweep: 350,
        };

        const anim: ActiveAnimation = {
            cells,
            effect,
            startTime: performance.now(),
            duration: DURATION[effect],
        };

        const tick = (now: number) => {
            const t = Math.min((now - anim.startTime) / anim.duration, 1);
            this.drawEffect(anim, t);
            if (t < 1) {
                anim.rafId = requestAnimationFrame(tick);
            } else {
                // Restore the cells to their true logical state at the end of the animation
                for (const { idx } of cells) {
                    const row = Math.floor(idx / GRID_SIZE);
                    const col = idx % GRID_SIZE;
                    this.drawCell(row, col, gridManager.grid[idx]);
                }
                onDone();
            }
        };

        anim.rafId = requestAnimationFrame(tick);
        this.activeAnimations.push(anim);
    }

    private drawEffect(anim: ActiveAnimation, t: number) {
        const { cells, effect } = anim;
        const ci = cells[0]?.colorIndex ?? 1;
        const color = CELL_COLORS[ci] || PIECE_COLORS[ci] || '#4CAF50';
        const ts = this.tileSize;

        const ctx = this.ctx;
        ctx.save();

        for (const { idx } of cells) {
            const row = Math.floor(idx / GRID_SIZE);
            const col = idx % GRID_SIZE;
            const cx = col * ts + ts / 2;
            const cy = row * ts + ts / 2;
            const x = col * ts;
            const y = row * ts;

            // Clip to cell bounds so effects don't leak into neighbors
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, ts, ts);
            ctx.clip();

            // Clear cell background first (fully opaque to prevent ghost traces)
            ctx.fillStyle = '#0f162d';
            ctx.fillRect(x, y, ts, ts);
            // Draw subtle grids INSIDE the clip so they don't bleed out and accumulate
            ctx.strokeStyle = 'rgba(80, 200, 255, 0.1)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x, y, ts, ts);

            switch (effect) {
                case 'flash': {
                    // Bright white flash that fades out
                    const alpha = 1 - t;
                    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                    ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
                    // Color underneath fades in reverse
                    ctx.fillStyle = this.hexWithAlpha(color, alpha * 0.6);
                    ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
                    break;
                }

                case 'shatter': {
                    // 4 triangular shards fly outward
                    const dist = t * ts * 0.8;
                    const alpha = 1 - t;
                    ctx.fillStyle = this.hexWithAlpha(color, alpha);
                    const shards = [
                        { dx: 0, dy: -dist },
                        { dx: dist, dy: 0 },
                        { dx: 0, dy: dist },
                        { dx: -dist, dy: 0 },
                    ];
                    const half = ts / 2 - 2;
                    for (const { dx, dy } of shards) {
                        ctx.save();
                        ctx.translate(cx + dx, cy + dy);
                        ctx.rotate(t * Math.PI);
                        ctx.fillRect(-half / 2, -half / 2, half, half);
                        ctx.restore();
                    }
                    break;
                }

                case 'melt': {
                    // Block drips downward and shrinks
                    const dropY = t * ts * 1.2;
                    const scaleX = 1 - t * 0.4;
                    const alpha = 1 - t;
                    ctx.save();
                    ctx.translate(cx, cy + dropY);
                    ctx.scale(scaleX, 1);
                    ctx.fillStyle = this.hexWithAlpha(color, alpha);
                    ctx.fillRect(-ts / 2 + 1, -ts / 2 + 1, ts - 2, ts - 2);
                    ctx.restore();
                    break;
                }

                case 'pulse': {
                    // Scale up then fade
                    const scale = 1 + t * 0.5;
                    const alpha = 1 - t;
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.scale(scale, scale);
                    ctx.fillStyle = this.hexWithAlpha(color, alpha);
                    ctx.fillRect(-ts / 2 + 1, -ts / 2 + 1, ts - 2, ts - 2);
                    ctx.restore();
                    break;
                }

                case 'ripple': {
                    // Expanding ring
                    const radius = Math.max(0.5, t * ts * 0.8);
                    const alpha = 1 - t;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = this.hexWithAlpha(color, alpha);
                    ctx.lineWidth = 3 * (1 - t) + 1;
                    ctx.stroke();
                    // Fading fill
                    ctx.fillStyle = this.hexWithAlpha(color, alpha * 0.4);
                    ctx.fill();
                    break;
                }

                case 'spark': {
                    // 6 small particles shooting outward
                    const alpha = 1 - t;
                    const numSparks = 6;
                    for (let i = 0; i < numSparks; i++) {
                        const angle = (i / numSparks) * Math.PI * 2;
                        const dist2 = t * ts * 0.9;
                        const px = cx + Math.cos(angle) * dist2;
                        const py = cy + Math.sin(angle) * dist2;
                        const r2 = Math.max(0.5, (1 - t) * (ts * 0.18) + 0.5);
                        ctx.beginPath();
                        ctx.arc(px, py, r2, 0, Math.PI * 2);
                        ctx.fillStyle = this.hexWithAlpha(color, alpha);
                        ctx.fill();
                    }
                    // Shrinking center
                    const cr = Math.max(0, (1 - t) * (ts / 2 - 2));
                    if (cr > 0) {
                        ctx.beginPath();
                        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                        ctx.fillStyle = this.hexWithAlpha(color, alpha * 0.5);
                        ctx.fill();
                    }
                    break;
                }

                case 'dissolve': {
                    // Pixelated dissolve — draw random sub-pixels that disappear
                    const alpha = 1 - t;
                    const pixelSize = Math.max(2, Math.floor(ts / 5));
                    ctx.fillStyle = this.hexWithAlpha(color, alpha);
                    const seed = idx * 137; // deterministic per cell
                    for (let pi = 0; pi < 16; pi++) {
                        // pseudo-random positions that disappear over time
                        const px2 = ((seed * (pi + 1) * 31) % (ts - pixelSize));
                        const py2 = ((seed * (pi + 1) * 17) % (ts - pixelSize));
                        const threshold = (pi / 16);
                        if (t < threshold) {
                            ctx.fillRect(x + Math.abs(px2), y + Math.abs(py2), pixelSize, pixelSize);
                        }
                    }
                    break;
                }

                case 'sweep': {
                    // Horizontal wipe from left to right
                    const wipeWidth = (1 - t) * (ts - 2);
                    ctx.fillStyle = color;
                    ctx.fillRect(x + 1, y + 1, wipeWidth, ts - 2);
                    // Bright leading edge
                    if (wipeWidth > 2) {
                        ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - t)})`;
                        ctx.fillRect(x + wipeWidth - 2, y + 1, 3, ts - 2);
                    }
                    break;
                }
            }

            ctx.restore(); // Restore per-cell clip
        }

        ctx.restore(); // Restore outer save
    }

    drawCell(row: number, col: number, state: number) {
        const ts = this.tileSize;
        const x = col * ts;
        const y = row * ts;
        const pad = 1.5;
        const r = ts * 0.12; // corner radius

        // Clear cell with dark background (fully opaque)
        this.ctx.fillStyle = '#0f162d';
        this.ctx.fillRect(x, y, ts, ts);

        // Subtle grid lines
        this.ctx.strokeStyle = 'rgba(80, 200, 255, 0.1)';
        this.ctx.lineWidth = 0.5;
        this.ctx.strokeRect(x, y, ts, ts);

        if (state > 0) {
            const color = CELL_COLORS[state] || PIECE_COLORS[state] || '#4CAF50';
            const bx = x + pad;
            const by = y + pad;
            const bw = ts - pad * 2;
            const bh = ts - pad * 2;

            // Main block with rounded corners
            this.ctx.beginPath();
            this.ctx.roundRect(bx, by, bw, bh, r);
            this.ctx.fillStyle = color;
            this.ctx.fill();

            // Top highlight bevel
            this.ctx.fillStyle = 'rgba(255,255,255,0.35)';
            this.ctx.beginPath();
            this.ctx.roundRect(bx, by, bw, 4, [r, r, 0, 0]);
            this.ctx.fill();

            // Left highlight bevel
            this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
            this.ctx.beginPath();
            this.ctx.roundRect(bx, by, 4, bh, [r, 0, 0, r]);
            this.ctx.fill();

            // Bottom shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
            this.ctx.beginPath();
            this.ctx.roundRect(bx, by + bh - 4, bw, 4, [0, 0, r, r]);
            this.ctx.fill();

            // Right shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
            this.ctx.beginPath();
            this.ctx.roundRect(bx + bw - 4, by, 4, bh, [0, r, r, 0]);
            this.ctx.fill();

            // Sparkle dot
            this.ctx.fillStyle = 'rgba(255,255,255,0.45)';
            this.ctx.beginPath();
            this.ctx.arc(bx + bw * 0.3, by + bh * 0.3, ts * 0.05, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    private hexWithAlpha(hex: string, alpha: number): string {
        // Convert #RRGGBB to rgba(r,g,b,alpha)
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
    }
}
