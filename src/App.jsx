import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AudioContext } from './context/AudioContext';
import { musicApi } from './services/musicApi';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Music, Plus, Trash2, ListPlus, Search } from 'lucide-react';
import './styles/app.css';

function App() {
  const { 
    currentTrack, isPlaying, currentTime, duration, isShuffle, isRepeat,
    playTrack, pauseTrack, seek, handleNext, handlePrev, setIsShuffle, setIsRepeat 
  } = useContext(AudioContext);
  
  const [allTracks, setAllTracks] = useState([]);
  const [apiSearchInput, setApiSearchInput] = useState(''); // Стейт для строки поиска
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState([
    { id: 'chill', name: 'Chill Vibes', trackIds: [] },
    { id: 'fav', name: 'Favorites', trackIds: [] }
  ]);
  const [activePlaylistId, setActivePlaylistId] = useState('chill');
  const location = useLocation();

  // Первичный запрос к настоящему API при старте приложения
  useEffect(() => {
    fetchTracksFromApi('synthwave'); // По умолчанию грузим атмосферный пак
  }, []);

  const fetchTracksFromApi = async (query) => {
    setLoading(true);
    const data = await musicApi.getTopTracks(query);
    setAllTracks(data);
    setLoading(false);
  };

  const handleApiSearchSubmit = (e) => {
    e.preventDefault();
    if (apiSearchInput.trim()) {
      fetchTracksFromApi(apiSearchInput.trim());
    }
  };

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || playlists[0];
  const currentPlaylistTracks = allTracks.filter(track => activePlaylist?.trackIds.includes(track.id));

  const handleCreatePlaylist = () => {
    const name = prompt('Введите название плейлиста:');
    if (!name || !name.trim()) return;
    setPlaylists([...playlists, { id: 'pl_' + Date.now(), name: name.trim(), trackIds: [] }]);
  };

  const handleAddTrack = (trackId) => {
    setPlaylists(playlists.map(pl => pl.id === activePlaylistId && !pl.trackIds.includes(trackId) 
      ? { ...pl, trackIds: [...pl.trackIds, trackId] } : pl));
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
            {Array.from({ length: 55 }).map((_, i) => (
              <div key={i} className="waveform-mock__bar" style={{ height: isPlaying ? `${Math.floor(Math.random() * 32) + 6}px` : '6px' }} />
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
          </div>
        </div>
      </section>

      {/* Меню выбора страниц и Контент */}
      <div className="tools-grid">
        <aside className="grid-block">
          <h3 className="grid-block__title">Навигация</h3>
          <ul className="playlist-list" style={{ marginBottom: '25px' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <li className={`playlist-item ${location.pathname === '/' ? 'playlist-item--active' : ''}`}>Главный редактор</li>
            </Link>
            <Link to="/all-tracks" style={{ textDecoration: 'none', color: 'inherit' }}>
              <li className={`playlist-item ${location.pathname === '/all-tracks' ? 'playlist-item--active' : ''}`}>Все треки медиатеки</li>
            </Link>
          </ul>

          <h3 className="grid-block__title">Плейлисты</h3>
          <ul className="playlist-list">
            {playlists.map(pl => (
              <li key={pl.id} className={`playlist-item ${pl.id === activePlaylistId && location.pathname === '/' ? 'playlist-item--active' : ''}`} onClick={() => { setActivePlaylistId(pl.id); }}>
                <span>{pl.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({pl.trackIds.length})</span>
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
                        <td>{i + 1}</td>
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
              ) : (
                <table className="tracks-table">
                  <thead>
                    <tr><th>#</th><th>Название трека</th><th>Длительность</th><th>Плейлист</th></tr>
                  </thead>
                  <tbody>
                    {allTracks.map((track, i) => (
                      <tr key={track.id} onClick={() => playTrack(track, allTracks)} style={{ background: currentTrack?.id === track.id ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer' }}>
                        <td>{i + 1}</td>
                        <td>
                          <div style={{ color: currentTrack?.id === track.id ? 'var(--cyan)' : 'white' }}>{track.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{track.artist}</div>
                        </td>
                        <td>{track.duration}</td>
                        <td>
                          <button className="btn-icon" style={{ color: 'var(--cyan)' }} onClick={(e) => { e.stopPropagation(); handleAddTrack(track.id); }}>
                            <ListPlus size={18} />
                          </button>
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