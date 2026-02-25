import React from 'react';
import { Piece } from './Piece';
import { SHAPES } from '../../../shared/constants';

interface PieceQueueProps {
    availablePieces: string[];
    tileSize: number;
    onDragStart: (e: any, shapeType: string, shape: number[][]) => void;
}

export const PieceQueue: React.FC<PieceQueueProps> = ({ availablePieces, tileSize, onDragStart }) => {
    return (
        <div
            className="piece-queue"
            style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                alignItems: 'center',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            } as React.CSSProperties}
        >
            {availablePieces.map((shapeType, index) => {
                let slotWidth = tileSize * 2;
                let slotHeight = tileSize * 2;

                if (shapeType) {
                    const blockShape = SHAPES[shapeType as keyof typeof SHAPES];
                    if (blockShape) {
                        slotWidth = (Math.max(...blockShape.map(c => c[1])) + 1) * tileSize;
                        slotHeight = (Math.max(...blockShape.map(c => c[0])) + 1) * tileSize;
                    }
                }

                return (
                    <div
                        key={index}
                        style={{
                            width: `${slotWidth}px`,
                            height: `${slotHeight}px`,
                            flex: '0 0 auto',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        {shapeType ? (
                            <Piece
                                shapeType={shapeType as keyof typeof SHAPES}
                                tileSize={tileSize}
                                onMouseDown={onDragStart}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', visibility: 'hidden' }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
