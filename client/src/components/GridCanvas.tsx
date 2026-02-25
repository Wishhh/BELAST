import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GridManager } from '../logic/GridManager';
import { CanvasRenderer } from '../logic/CanvasRenderer';
import { GRID_SIZE, SHAPES, SHAPE_COLORS, PIECE_COLORS } from '../../../shared/constants';
import { PieceQueue } from './PieceQueue';
import { NetworkManager } from '../logic/NetworkManager';

interface GridCanvasProps {
    networkManager?: NetworkManager;
    roomId?: string | null;
    onScoreChange?: (score: number) => void;
    onGameOver?: (finalScore: number) => void;
    isPvp?: boolean;
}

function computeTileSize(isPvp: boolean): number {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxWidth = w * 0.88;
    const paddingOffset = isPvp ? 440 : 250;
    const maxHeight = h - paddingOffset;

    // Pick whichever dimension is strictly smaller so the grid never causes the page to overflow
    let size = Math.floor(Math.min(maxWidth, Math.max(maxHeight, 200)) / GRID_SIZE);

    if (size > 36) size = 36;
    if (size < 12) size = 12;
    return size;
}

export const GridCanvas: React.FC<GridCanvasProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const managerRef = useRef<GridManager>(new GridManager());
    const rendererRef = useRef<CanvasRenderer | null>(null);

    const [tileSize, setTileSize] = useState<number>(() => computeTileSize(!!props.isPvp));
    const tileSizeRef = useRef(tileSize);
    tileSizeRef.current = tileSize;

    // Game State
    const [pieces, setPieces] = useState<string[]>(['TRIO_H', 'SQUARE', 'TETRIS_L']);
    const [score, setScore] = useState(0);
    const scoreRef = useRef(score);
    scoreRef.current = score;
    const [gameOver, setGameOver] = useState(false);

    // ── Drag State — ALL refs to prevent stale closures ──
    const dragShapeRef = useRef<{ type: string, shape: number[][] } | null>(null);
    const dragPosRef = useRef<{ x: number, y: number } | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const rafDragRef = useRef<number>(0);
    // Only used for triggering React re-renders when overlay visibility changes
    const [dragVisible, setDragVisible] = useState(false);

    const [floatingTexts, setFloatingTexts] = useState<{ id: number, x: number, y: number, text: string, color: string }[]>([]);

    // Keep a ref to networkManager so event handlers always see the latest
    const networkManagerRef = useRef(props.networkManager);
    networkManagerRef.current = props.networkManager;

    // Recompute tile size on window resize / orientation change
    useEffect(() => {
        const onResize = () => {
            setTileSize(computeTileSize(!!props.isPvp));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [props.isPvp]);

    // Lift score to parent
    useEffect(() => {
        props.onScoreChange?.(score);
    }, [score, props.onScoreChange]);

    const boardPixelSize = tileSize * GRID_SIZE;

    // Init / reinit canvas whenever tileSize changes
    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                const dpr = window.devicePixelRatio || 1;
                canvasRef.current.width = boardPixelSize * dpr;
                canvasRef.current.height = boardPixelSize * dpr;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
                canvasRef.current.style.width = `${boardPixelSize}px`;
                canvasRef.current.style.height = `${boardPixelSize}px`;

                rendererRef.current = new CanvasRenderer(ctx, boardPixelSize, boardPixelSize, tileSize);
                rendererRef.current.drawGrid(managerRef.current);
            }
        }
    }, [tileSize, boardPixelSize]);

    // ── Drag Handlers — stable callbacks, read from refs ──

    const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, shapeType: string, shape: number[][]) => {
        if ('button' in e) {
            e.preventDefault();
        }

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        dragShapeRef.current = { type: shapeType, shape };
        dragPosRef.current = { x: clientX, y: clientY };
        setDragVisible(true); // trigger re-render to show overlay
    }, []);

    // This handler reads ONLY from refs — no stale closure risk
    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!dragShapeRef.current || !dragPosRef.current) return;
        e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        dragPosRef.current = { x: clientX, y: clientY };

        // Direct DOM update via rAF for 60fps smoothness
        cancelAnimationFrame(rafDragRef.current);
        rafDragRef.current = requestAnimationFrame(() => {
            if (overlayRef.current && dragPosRef.current) {
                overlayRef.current.style.left = `${dragPosRef.current.x}px`;
                overlayRef.current.style.top = `${dragPosRef.current.y}px`;
            }
        });
    }, []); // ← empty deps! Reads from refs only.

    // This handler also reads ONLY from refs
    const handleDragEnd = useCallback((_e: MouseEvent | TouchEvent) => {
        const draggedShape = dragShapeRef.current;
        const dragPos = dragPosRef.current;

        if (!draggedShape || !dragPos || !canvasRef.current) {
            // Clean up any partial state
            dragShapeRef.current = null;
            dragPosRef.current = null;
            setDragVisible(false);
            return;
        }

        const ts = tileSizeRef.current;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = dragPos.x - rect.left;
        const y = dragPos.y - rect.top;

        const shapeRows = Math.max(...draggedShape.shape.map(p => p[0])) + 1;
        const shapeCols = Math.max(...draggedShape.shape.map(p => p[1])) + 1;
        const col = Math.round((x - (shapeCols * ts / 2)) / ts);
        const row = Math.round((y - (shapeRows * ts / 2)) / ts);

        if (managerRef.current.canPlace(draggedShape.shape, row, col)) {
            const { clearedLines, score: moveScore, clearedCells } = managerRef.current.place(
                draggedShape.shape, row, col, draggedShape.type
            );
            setScore(prev => prev + moveScore);

            setPieces(prev => {
                const idx = prev.indexOf(draggedShape.type);
                if (idx > -1) {
                    const newPieces = [...prev];
                    newPieces[idx] = '';
                    return newPieces;
                }
                return prev;
            });

            const textX = (col + shapeCols / 2) * ts;
            const textY = (row + shapeRows / 2) * ts;
            const newText = {
                id: Date.now(),
                x: textX,
                y: textY,
                text: `+${moveScore}`,
                color: clearedLines > 0 ? '#FFD700' : '#FFF'
            };
            setFloatingTexts(prev => [...prev, newText]);
            setTimeout(() => {
                setFloatingTexts(prev => prev.filter(t => t.id !== newText.id));
            }, 1000);

            rendererRef.current?.drawDirty(managerRef.current);
            if (clearedCells.length > 0) {
                rendererRef.current?.playClearAnimation(clearedCells, managerRef.current);
            }

            const nm = networkManagerRef.current;
            if (nm) {
                nm.sendMove(
                    managerRef.current.getGridState(),
                    scoreRef.current + moveScore,
                    clearedLines
                );
            }
        }

        // Always clean up — no matter what
        dragShapeRef.current = null;
        dragPosRef.current = null;
        setDragVisible(false);
        cancelAnimationFrame(rafDragRef.current);
    }, []); // ← empty deps! Reads from refs only.

    // Block text selection globally while dragging
    useEffect(() => {
        const blockSelect = (e: Event) => {
            if (dragShapeRef.current) e.preventDefault();
        };
        window.addEventListener('selectstart', blockSelect);
        return () => window.removeEventListener('selectstart', blockSelect);
    }, []);

    // Register global event listeners ONCE (stable handlers, no re-registration)
    useEffect(() => {
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('touchend', handleDragEnd);

        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [handleDragMove, handleDragEnd]);

    // Network updates — separate effect
    useEffect(() => {
        if (props.networkManager) {
            const handleUpdate = (data: any) => {
                if (data.garbage) {
                    managerRef.current.addGarbage(data.garbage);
                    rendererRef.current?.drawDirty(managerRef.current);
                }
            };
            props.networkManager.onOpponentUpdate(handleUpdate);
        }
    }, [props.networkManager]);

    // Generate new pieces if all used
    useEffect(() => {
        if (pieces.every(p => p === '')) {
            const shapesKeys = Object.keys(SHAPES);
            const newPieces = [
                shapesKeys[Math.floor(Math.random() * shapesKeys.length)],
                shapesKeys[Math.floor(Math.random() * shapesKeys.length)],
                shapesKeys[Math.floor(Math.random() * shapesKeys.length)]
            ];
            setPieces(newPieces);
        }
    }, [pieces]);

    // Check Game Over
    useEffect(() => {
        const availableShapes = pieces.filter(p => p !== '').map(p => SHAPES[p as keyof typeof SHAPES]);
        if (availableShapes.length > 0) {
            if (!managerRef.current.hasPossibleMoves(availableShapes)) {
                if (!gameOver) {
                    setGameOver(true);
                    if (props.networkManager && props.roomId) {
                        props.networkManager.sendGameOver(props.roomId);
                    }
                    if (props.onGameOver) {
                        props.onGameOver(score);
                    }
                }
            }
        }
    }, [pieces, score, gameOver, props.networkManager, props.roomId, props.onGameOver]);

    // Read from ref for render (only re-renders when dragVisible changes)
    const currentDragShape = dragShapeRef.current;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            } as React.CSSProperties}
        >
            {gameOver && <div className="game-over-text">GAME OVER</div>}

            <div className="grid-frame">
                <canvas ref={canvasRef} />

                {/* Floating score popups */}
                {floatingTexts.map(ft => (
                    <div
                        key={ft.id}
                        style={{
                            position: 'absolute',
                            left: ft.x + 8,
                            top: ft.y + 8,
                            color: ft.color,
                            fontFamily: "'Fredoka One', cursive",
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            pointerEvents: 'none',
                            textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                            animation: 'floatUp 1s ease forwards',
                        }}
                    >
                        {ft.text}
                    </div>
                ))}
            </div>

            <div className="next-block-label">Next Block</div>

            <div
                className="piece-tray"
                style={{
                    pointerEvents: gameOver ? 'none' : 'auto',
                    opacity: gameOver ? 0.4 : 1,
                }}
            >
                <PieceQueue
                    availablePieces={pieces}
                    tileSize={tileSize}
                    onDragStart={handleDragStart}
                />
            </div>

            {/* Dragged Clone Overlay — positioned via ref for 60fps smoothness */}
            {dragVisible && currentDragShape && !gameOver && (
                <div
                    ref={overlayRef}
                    className="drag-overlay"
                    style={{
                        position: 'fixed',
                        left: dragPosRef.current?.x ?? 0,
                        top: dragPosRef.current?.y ?? 0,
                        pointerEvents: 'none',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        willChange: 'left, top',
                    }}
                >
                    <PieceOverlay shape={currentDragShape.shape} shapeType={currentDragShape.type} tileSize={tileSize} />
                </div>
            )}
        </div>
    );
};

const PieceOverlay: React.FC<{ shape: number[][], shapeType: string, tileSize: number }> = ({ shape, shapeType, tileSize }) => {
    const width = Math.max(...shape.map(c => c[1])) + 1;
    const height = Math.max(...shape.map(c => c[0])) + 1;
    const colorIndex = SHAPE_COLORS[shapeType] ?? 1;
    const color = PIECE_COLORS[colorIndex] ?? '#4CAF50';
    return (
        <svg
            width={width * tileSize}
            height={height * tileSize}
            viewBox={`0 0 ${width} ${height}`}
            style={{ display: 'block', filter: 'drop-shadow(0px 5px 8px rgba(0,0,0,0.5))' }}
        >
            {shape.map(([r, c], i) => (
                <g key={i}>
                    <rect x={c + 0.025} y={r + 0.025} width="0.95" height="0.95" fill={color} rx="0.12" />
                    <rect x={c + 0.06} y={r + 0.06} width="0.83" height="0.14" fill="rgba(255,255,255,0.4)" rx="0.06" />
                    <rect x={c + 0.06} y={r + 0.06} width="0.14" height="0.83" fill="rgba(255,255,255,0.25)" rx="0.06" />
                    <rect x={c + 0.06} y={r + 0.78} width="0.83" height="0.14" fill="rgba(0,0,0,0.2)" rx="0.06" />
                </g>
            ))}
        </svg>
    );
};
