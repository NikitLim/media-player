import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AudioContext } from './context/AudioContext';
import { musicApi } from './services/musicApi';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Music, Plus, Trash2, ListPlus, Search, Volume2 } from 'lucide-react';
import './styles/app.css';

const defaultPlaylists = [
  { id: 'chill', name: 'Chill Vibes', trackIds: [] },
  { id: 'fav', name: 'Favorites', trackIds: [] }
];

const getStoredValue = (key, fallback) => {
  const storedValue = localStorage.getItem(key);

  if (storedValue === null) {
    return fallback;
  }

  try {
    return JSON.parse(storedValue);
  } catch {
    return fallback;
  }
};

const normalizePlaylists = (items) => (
  Array.isArray(items)
    ? items.map((playlist) => ({
      ...playlist,
      trackIds: Array.isArray(playlist.trackIds) ? [...new Set(playlist.trackIds)] : [],
    }))
    : []
);

function App() {
  const { 
    currentTrack, isPlaying, currentTime, duration, volume, isShuffle, isRepeat,
    waveformLevels, playTrack, pauseTrack, seek, handleNext, handlePrev, setIsShuffle, setIsRepeat, setVolume 
  } = useContext(AudioContext);
  
  const [allTracks, setAllTracks] = useState([]);
  const [apiSearchInput, setApiSearchInput] = useState(''); // Стейт для строки поиска
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [playlistTargets, setPlaylistTargets] = useState({});
  const [playlists, setPlaylists] = useState(() => {
    const storedPlaylists = normalizePlaylists(getStoredValue('playlists', defaultPlaylists));

    return Array.isArray(storedPlaylists) && storedPlaylists.length > 0
      ? storedPlaylists
      : defaultPlaylists;
  });
  const [activePlaylistId, setActivePlaylistId] = useState(() => {
    const storedActivePlaylistId = localStorage.getItem('activePlaylistId');
    return storedActivePlaylistId || defaultPlaylists[0].id;
  });
  const location = useLocation();
  const navigate = useNavigate();

  // Первичный запрос к настоящему API при старте приложения
  useEffect(() => {
    fetchTracksFromApi('synthwave'); // По умолчанию грузим атмосферный пак
  }, []);

  useEffect(() => {
    localStorage.setItem('playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('activePlaylistId', activePlaylistId);
  }, [activePlaylistId]);

  useEffect(() => {
    if (playlists.length > 0 && !playlists.some((playlist) => playlist.id === activePlaylistId)) {
      setActivePlaylistId(playlists[0].id);
    }
  }, [playlists, activePlaylistId]);

  const fetchTracksFromApi = async (query) => {
    setLoading(true);
    setApiError('');

    try {
      const data = await musicApi.getTopTracks(query);
      setAllTracks(data);
    } catch {
      setAllTracks([]);
      setApiError('Ой, не удалось подключиться к серверам Apple Music. Проверьте соединение');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFetch = () => {
    fetchTracksFromApi(apiSearchInput.trim() || 'synthwave');
  };

  const handleApiSearchSubmit = (e) => {
    e.preventDefault();
    if (apiSearchInput.trim()) {
      fetchTracksFromApi(apiSearchInput.trim());
    }
  };

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || playlists[0];
  const currentPlaylistTracks = allTracks.filter(track => activePlaylist?.trackIds.includes(track.id));
  const renderActiveTrackBadge = (trackId) => (
    currentTrack?.id === trackId ? <span className="active-track-badge" aria-hidden="true" /> : null
  );
  const availablePlaylistOptions = playlists.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
  }));

  const getTargetPlaylistId = (trackId) => playlistTargets[trackId] || activePlaylistId;

  const openPlaylist = (playlistId) => {
    setActivePlaylistId(playlistId);
    navigate('/');
  };

  const setTargetPlaylistId = (trackId, playlistId) => {
    setPlaylistTargets((currentTargets) => ({
      ...currentTargets,
      [trackId]: playlistId,
    }));
  };

  const handleCreatePlaylist = () => {
    const name = prompt('Введите название плейлиста:');
    if (!name || !name.trim()) return;
    setPlaylists((currentPlaylists) => [...currentPlaylists, { id: 'pl_' + Date.now(), name: name.trim(), trackIds: [] }]);
  };

  const handleAddTrack = (trackId) => {
    handleAddTrackToPlaylist(trackId, getTargetPlaylistId(trackId));
  };

  const handleAddTrackToPlaylist = (trackId, playlistId) => {
    setPlaylists((currentPlaylists) => currentPlaylists.map((playlist) => (
      playlist.id === playlistId
        ? { ...playlist, trackIds: playlist.trackIds.includes(trackId) ? playlist.trackIds : [...playlist.trackIds, trackId] }
        : playlist
    )));
  };

  const handleRemoveTrack = (trackId) => {
    setPlaylists(playlists.map(pl => pl.id === activePlaylistId 
      ? { ...pl, trackIds: pl.trackIds.filter(id => id !== trackId) } : pl));
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    return `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="syncwave-player">
      <header className="player-header">
        <div className="player-header__logo">
          <Music className="logo-glow" size={28} />
          <span>SYNCWAVE PLAYER</span>
        </div>
      </header>

      {/* Пульт управления */}
      <section className="main-card">
        <div className="main-card__cover" style={{ backgroundImage: currentTrack ? `url(${currentTrack.cover})` : 'none', backgroundSize: 'cover', backgroundColor: '#1a2230' }}></div>
        <div className="main-card__body">
          <h2 className="main-card__title">{currentTrack ? `${currentTrack.artist} - ${currentTrack.title}` : 'Выберите трек из внешнего API'}</h2>
          
          <div className="waveform-mock">
            {waveformLevels.map((level, i) => (
              <div
                key={i}
                className="waveform-mock__bar"
                style={{ height: isPlaying ? `${level}px` : '6px' }}
              />
            ))}
          </div>

          <div className="timeline">
            <span>{formatTime(currentTime)}</span>
            <input type="range" className="timeline__range" min="0" max={duration || 100} value={currentTime} onChange={(e) => seek(Number(e.target.value))} />
            <span>{formatTime(duration)}</span>
          </div>

          <div className="controls-bar">
            <button className="btn-icon" onClick={() => setIsShuffle(!isShuffle)} style={{ color: isShuffle ? 'var(--cyan)' : 'var(--text-muted)' }}><Shuffle size={18} /></button>
            <button className="btn-icon" onClick={handlePrev}><SkipBack size={20} /></button>
            {isPlaying ? (
              <button className="btn-icon btn-icon--play" onClick={pauseTrack}><Pause size={22} /></button>
            ) : (
              <button className="btn-icon btn-icon--play" onClick={() => playTrack(currentTrack || allTracks[0], allTracks)}><Play size={22} /></button>
            )}
            <button className="btn-icon" onClick={handleNext}><SkipForward size={20} /></button>
            <button className="btn-icon" onClick={() => setIsRepeat(!isRepeat)} style={{ color: isRepeat ? 'var(--cyan)' : 'var(--text-muted)' }}><Repeat size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px', color: 'var(--text-muted)' }}>
              <Volume2 size={18} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                aria-label="Громкость"
                style={{ width: '120px' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Меню выбора страниц и Контент */}
      <div className="tools-grid">
        <aside className="grid-block">
          <h3 className="grid-block__title">Навигация</h3>
          <ul className="playlist-list" style={{ marginBottom: '25px' }}>
            <Link to="/all-tracks" style={{ textDecoration: 'none', color: 'inherit' }}>
              <li className={`playlist-item ${location.pathname === '/all-tracks' ? 'playlist-item--active' : ''}`}>Все треки медиатеки</li>
            </Link>
          </ul>

          <div className="playlist-panel__header">
            <h3 className="grid-block__title">Плейлисты</h3>
            <span className="playlist-panel__hint">Выберите плейлист для добавления трека прямо в строке</span>
          </div>
          <ul className="playlist-list playlist-list--compact">
            {playlists.map(pl => (
              <li
                key={pl.id}
                className={`playlist-item ${pl.id === activePlaylistId && location.pathname === '/' ? 'playlist-item--active' : ''}`}
                onClick={() => openPlaylist(pl.id)}
              >
                <span>{pl.name}</span>
                <span className="playlist-item__count">{pl.trackIds.length}</span>
              </li>
            ))}
          </ul>
          <button className="btn-add" onClick={handleCreatePlaylist}><Plus size={14} /> Создать плейлист</button>
        </aside>

        {/* Роутинг страниц */}
        <Routes>
          {/* Страница 1: Редактор активного плейлиста */}
          <Route path="/" element={
            <main className="grid-block">
              <h3 className="grid-block__title">Редактор плейлиста: {activePlaylist?.name}</h3>
              <table className="tracks-table">
                <thead>
                  <tr><th>#</th><th>Название</th><th>Длительность</th><th>Действия</th></tr>
                </thead>
                <tbody>
                  {currentPlaylistTracks.length === 0 ? (
                    <tr><td colSpan="4" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>В плейлисте пусто. Перейдите во вкладку "Все треки медиатеки" и соберите свой список через внешнее API.</td></tr>
                  ) : (
                    currentPlaylistTracks.map((track, i) => (
                      <tr key={track.id} onClick={() => playTrack(track, currentPlaylistTracks)} style={{ background: currentTrack?.id === track.id ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer' }}>
                            <td>
                              <span className="track-number">
                                {i + 1}
                                {renderActiveTrackBadge(track.id)}
                              </span>
                            </td>
                        <td>
                          <div style={{ color: currentTrack?.id === track.id ? 'var(--cyan)' : 'white' }}>{track.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{track.artist}</div>
                        </td>
                        <td>{track.duration}</td>
                        <td><button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleRemoveTrack(track.id); }}><Trash2 size={14} /></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </main>
          } />

          {/* Страница 2: Все треки каталога (с поиском по внешнему API) */}
          <Route path="/all-tracks" element={
            <main className="grid-block">
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
                <h3 className="grid-block__title" style={{ margin: 0 }}>Внешняя медиатека Apple Music</h3>
                
                {/* Форма живого поиска по сети */}
                <form onSubmit={handleApiSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                  <input 
                    type="text" 
                    placeholder="Поиск исполнителя или песни по всему миру..." 
                    value={apiSearchInput}
                    onChange={(e) => setApiSearchInput(e.target.value)}
                    style={{ padding: '8px 12px', background: '#161c27', border: '1px solid #252f44', borderRadius: '6px', color: 'white', width: '60%', maxWidth: '350px' }}
                  />
                  <button type="submit" className="btn-add" style={{ margin: 0, width: 'auto', padding: '0 12px' }}><Search size={16} /></button>
                </form>
              </div>

              {loading ? (
                <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>Выполняется fetch-запрос к внешним серверам...</div>
              ) : apiError ? (
                <div style={{
                  padding: '28px',
                  borderRadius: '14px',
                  border: '1px solid #2c3550',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                  textAlign: 'center',
                }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '18px', color: 'white' }}>Нет соединения</h4>
                  <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {apiError}
                  </p>
                  <button className="btn-add" onClick={handleRetryFetch} style={{ margin: 0 }}>
                    <Search size={16} /> Попробовать снова
                  </button>
                </div>
              ) : (
                <table className="tracks-table">
                  <thead>
                    <tr><th>#</th><th>Название трека</th><th>Длительность</th><th>Добавить в</th></tr>
                  </thead>
                  <tbody>
                    {allTracks.map((track, i) => (
                      <tr key={track.id} onClick={() => playTrack(track, allTracks)} style={{ background: currentTrack?.id === track.id ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer' }}>
                          <td>
                            <span className="track-number">
                              {i + 1}
                              {renderActiveTrackBadge(track.id)}
                            </span>
                          </td>
                        <td>
                          <div style={{ color: currentTrack?.id === track.id ? 'var(--cyan)' : 'white' }}>{track.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{track.artist}</div>
                        </td>
                        <td>{track.duration}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="track-add-control">
                            <select
                              className="track-add-control__select"
                              value={getTargetPlaylistId(track.id)}
                              onChange={(e) => setTargetPlaylistId(track.id, e.target.value)}
                              aria-label={`Выбрать плейлист для трека ${track.title}`}
                            >
                              {availablePlaylistOptions.map((playlist) => (
                                <option key={playlist.id} value={playlist.id}>
                                  {playlist.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="track-add-control__button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddTrackToPlaylist(track.id, getTargetPlaylistId(track.id));
                              }}
                              title="Добавить в выбранный плейлист"
                            >
                              <ListPlus size={16} />
                              <span>Добавить</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </main>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App