import React from 'react';
import { SHAPES, SHAPE_COLORS, PIECE_COLORS } from '../../../shared/constants';

interface PieceProps {
    shapeType: keyof typeof SHAPES;
    tileSize: number;
    onMouseDown: (e: React.MouseEvent | React.TouchEvent, shapeType: string, shape: number[][]) => void;
}

export const Piece: React.FC<PieceProps> = ({ shapeType, tileSize, onMouseDown }) => {
    const shape = SHAPES[shapeType];
    const width = Math.max(...shape.map(c => c[1])) + 1;
    const height = Math.max(...shape.map(c => c[0])) + 1;
    const colorIndex = SHAPE_COLORS[shapeType as string] ?? 1;
    const color = PIECE_COLORS[colorIndex] ?? '#4CAF50';

    return (
        <div
            className="piece-container"
            onMouseDown={(e) => onMouseDown(e, shapeType, shape)}
            onTouchStart={(e) => onMouseDown(e, shapeType, shape)}
            style={{
                width: `${width * tileSize}px`,
                height: `${height * tileSize}px`,
                flex: '0 0 auto',
                cursor: 'grab',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                display: 'block'
            }}
        >
            <svg
                width={width * tileSize}
                height={height * tileSize}
                viewBox={`0 0 ${width} ${height}`}
                style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.35))' }}
            >
                {shape.map(([r, c], i) => (
                    <g key={i}>
                        {/* Main block */}
                        <rect x={c + 0.025} y={r + 0.025} width="0.95" height="0.95" fill={color} rx="0.12" />
                        {/* Top highlight */}
                        <rect x={c + 0.06} y={r + 0.06} width="0.83" height="0.14" fill="rgba(255,255,255,0.4)" rx="0.06" />
                        {/* Left highlight */}
                        <rect x={c + 0.06} y={r + 0.06} width="0.14" height="0.83" fill="rgba(255,255,255,0.25)" rx="0.06" />
                        {/* Bottom shadow */}
                        <rect x={c + 0.06} y={r + 0.78} width="0.83" height="0.14" fill="rgba(0,0,0,0.2)" rx="0.06" />
                        {/* Right shadow */}
                        <rect x={c + 0.78} y={r + 0.06} width="0.14" height="0.83" fill="rgba(0,0,0,0.12)" rx="0.06" />
                        {/* Center sparkle dot */}
                        <circle cx={c + 0.35} cy={r + 0.35} r="0.06" fill="rgba(255,255,255,0.5)" />
                    </g>
                ))}
            </svg>
        </div>
    );
};
