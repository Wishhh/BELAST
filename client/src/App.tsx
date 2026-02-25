import { useState, useRef, useEffect } from 'react'
import './App.css'
import { GridCanvas } from './components/GridCanvas'
import { OpponentCanvas } from './components/OpponentCanvas'
import { NetworkManager } from './logic/NetworkManager'
import { GRID_SIZE } from '../../shared/constants'
import { useAuth } from './logic/AuthContext'
import { AuthModal } from './components/AuthModal'
import { ProfileModal } from './components/ProfileModal'
import { ConfirmModal } from './components/ConfirmModal'

function computeOpponentTileSize(): number {
  const w = window.innerWidth;
  const isNarrow = w < 640;
  if (isNarrow) {
    // Make opponent grid small enough to fit neatly in the top right corner
    return Math.floor((w * 0.25) / GRID_SIZE);
  }
  return 20;
}

function App() {
  const [inGame, setInGame] = useState(false);
  const [soloMode, setSoloMode] = useState(false);
  const [score, setScore] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchingMatch, setSearchingMatch] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const { user, profile, signOut } = useAuth();
  const [opponentData, setOpponentData] = useState<{ grid: number[], score: number } | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<{ username: string, elo_rating: number } | null>(null);
  const [opponentTileSize, setOpponentTileSize] = useState<number>(computeOpponentTileSize);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const networkManagerRef = useRef<NetworkManager | null>(null);

  useEffect(() => {
    const onResize = () => setOpponentTileSize(computeOpponentTileSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleStart = () => {
    if (!networkManagerRef.current) {
      const serverUrl = `http://${window.location.hostname}:3000`;
      networkManagerRef.current = new NetworkManager(serverUrl);
      networkManagerRef.current.connect();

      networkManagerRef.current.onMatchFound((data) => {
        console.log('Match found!', data);
        setCurrentRoomId(data.roomId);
        setOpponentProfile(data.opponentProfile);
        setSearchingMatch(false);
        setInGame(true);
      });

      networkManagerRef.current.onGameOver((data) => {
        alert(`Game Over! Result: ${data.result} (${data.reason})`);
        setInGame(false);
        setOpponentData(null);
      });

      networkManagerRef.current.onOpponentUpdate((data) => {
        if (data.grid) {
          setOpponentData({ grid: data.grid, score: data.score || 0 });
        }
      });
    }

    networkManagerRef.current.findMatch(user?.id || null);
    setSearchingMatch(true);
  };

  const handleCancelSearch = () => {
    if (networkManagerRef.current) {
      networkManagerRef.current.cancelMatch();
      setSearchingMatch(false);
    }
  };

  const handleSoloPlay = () => {
    setSoloMode(true);
    setInGame(true);
    setScore(0);
  };

  const handleExit = () => {
    if (soloMode) {
      if (!window.confirm("End run and save your score?")) return;
      handleGameOver(score);
    } else {
      if (!window.confirm("Forfeit the match? This will count as a loss.")) return;
      if (networkManagerRef.current && currentRoomId) {
        networkManagerRef.current.sendGameOver(currentRoomId);
      }
    }

    setInGame(false);
    setSoloMode(false);
    setScore(0);
    setOpponentData(null);
    setCurrentRoomId(null);

    // Disconnect from server if in multiplayer
    if (!soloMode && networkManagerRef.current) {
      networkManagerRef.current.disconnect?.();
      networkManagerRef.current = null;
    }
  };

  const handleGameOver = async (finalScore: number) => {
    if (soloMode && user) {
      // Import handled at top via supabaseClient
      const { supabase } = await import('./logic/supabaseClient');

      // Save solo match
      await supabase.from('solo_match_history').insert({ player_id: user.id, score: finalScore, cleared_lines: 0 });

      // Update high score if beaten
      if (!profile || finalScore > (profile.highest_solo_score || 0)) {
        await supabase.from('profiles').update({ highest_solo_score: finalScore }).eq('id', user.id);
      }
    }
  };

  return (
    <div className="App">
      {/* ── Profile / Auth Section ── */}
      <div className="profile-bar">
        {profile ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="auth-trigger-btn" onClick={() => setShowProfileModal(true)}>
              <span style={{ color: '#FFF' }}>{profile.username}</span> <span style={{ color: '#FFD700', fontSize: '0.8rem' }}>({profile.elo_rating} Elo)</span>
            </button>
            <button className="auth-trigger-btn" onClick={signOut} style={{ padding: '8px 12px' }}>
              ⎋
            </button>
          </div>
        ) : user ? (
          <button className="auth-trigger-btn" onClick={signOut}>
            Sign Out
          </button>
        ) : (
          <button className="auth-trigger-btn" onClick={() => setShowAuthModal(true)}>
            Sign In / Register
          </button>
        )}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {searchingMatch && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: '#FFF' }}>Looking for opponent...</h2>
          <button className="cancel-btn" onClick={handleCancelSearch}>Cancel</button>
        </div>
      )}

      <h1 className="game-title">BeLast</h1>

      <div className="game-area">
        <div className="player-section">
          <div className="top-bar">
            <div className="score-badge">
              <span className="score-label">Score</span>
              <span className="score-value">{score}</span>
              <span className="score-stars">⭐⭐⭐</span>
            </div>

            {inGame && (
              <button className="exit-btn" onClick={handleExit} title="Exit to menu">
                ✕
              </button>
            )}
          </div>

          {!inGame ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', marginTop: '20px' }}>
              {profile && (
                <div style={{
                  fontFamily: "'Fredoka One', cursive",
                  color: '#4FC3F7',
                  fontSize: '1.2rem',
                  textShadow: '0 2px 5px rgba(0,0,0,0.5)',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(79, 195, 247, 0.3)'
                }}>
                  Highest Score: <span style={{ color: '#FFF' }}>{profile.highest_solo_score || 0}</span>
                </div>
              )}
              <button className="find-match-btn" onClick={handleSoloPlay}>
                Play Solo
              </button>
              <button className="find-match-btn" onClick={handleStart} style={{ background: 'linear-gradient(135deg, #7E57C2, #5C35A8)' }}>
                Find Match
              </button>
            </div>
          ) : (
            <GridCanvas
              networkManager={soloMode ? undefined : networkManagerRef.current!}
              roomId={currentRoomId}
              onScoreChange={setScore}
              onGameOver={handleGameOver}
              isPvp={!soloMode}
            />
          )}
        </div>

        {inGame && !soloMode && (
          <div className="opponent-section">
            <OpponentCanvas
              gridData={opponentData?.grid || []}
              score={opponentData?.score || 0}
              tileSize={opponentTileSize}
              profile={opponentProfile}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
