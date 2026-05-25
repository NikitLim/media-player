import React, { createContext, useState, useEffect, useRef } from 'react';

export const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Инициализируем нативный объект Audio через useRef (ООП в функциональных компонентах)
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;

    // Слушатели событий аудио-потока
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const playTrack = (track) => {
    if (!track) return;
    
    // Если включили НОВЫЙ трек — меняем источник
    if (!currentTrack || currentTrack.id !== track.id) {
      setCurrentTrack(track);
      audioRef.current.src = track.src;
    }
    
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(err => console.log("Ошибка воспроизведения:", err));
  };

  const pauseTrack = () => {
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <AudioContext.Provider value={{ 
      currentTrack, isPlaying, currentTime, duration, playTrack, pauseTrack, seek 
    }}>
      {children}
    </AudioContext.Provider>
  );
};