import React, { useEffect, useRef } from 'react';
import { CanvasRenderer } from '../logic/CanvasRenderer';
import { GridManager } from '../logic/GridManager';
import { GRID_SIZE } from '../../../shared/constants';

interface OpponentCanvasProps {
    gridData: Int8Array | number[];
    score: number;
    tileSize: number;
    profile: { username: string, elo_rating: number } | null;
}

export const OpponentCanvas: React.FC<OpponentCanvasProps> = ({ gridData, score, tileSize, profile }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<CanvasRenderer | null>(null);
    const managerRef = useRef<GridManager>(new GridManager());

    const boardPixelSize = tileSize * GRID_SIZE;

    // Reinit canvas whenever tileSize changes
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

    useEffect(() => {
        if (gridData && rendererRef.current) {
            const typedGrid = gridData instanceof Int8Array ? gridData : new Int8Array(gridData);
            managerRef.current.setGridState(typedGrid);
            rendererRef.current.drawGrid(managerRef.current);
        }
    }, [gridData]);

    const profileName = profile?.username ? profile.username : 'Guest';
    const profileElo = profile?.elo_rating ? profile.elo_rating : '1000';

    return (
        <div className="opponent-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="opponent-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span className="opp-name" style={{ fontSize: '0.9rem', color: '#FFF' }}>{profileName}</span>
                <span className="opp-elo" style={{ fontSize: '0.7rem', color: '#FFD700' }}>Elo: {profileElo}</span>
            </div>
            <div className="opponent-frame">
                <canvas ref={canvasRef} />
            </div>
            <div className="opponent-score">Score: {score}</div>
        </div>
    );
};
