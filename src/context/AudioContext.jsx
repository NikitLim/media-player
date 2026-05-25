import React, { createContext, useState, useEffect, useRef } from 'react';

export const AudioContext = createContext();

const WAVEFORM_BAR_COUNT = 55;

const getStoredAudioState = () => {
  const storedAudioState = localStorage.getItem('audioState');

  if (!storedAudioState) {
    return {
      currentTrack: null,
      queue: [],
      currentIndex: -1,
      volume: 1,
    };
  }

  try {
    const parsedAudioState = JSON.parse(storedAudioState);

    return {
      currentTrack: parsedAudioState.currentTrack ?? null,
      queue: Array.isArray(parsedAudioState.queue) ? parsedAudioState.queue : [],
      currentIndex: Number.isInteger(parsedAudioState.currentIndex) ? parsedAudioState.currentIndex : -1,
      volume: typeof parsedAudioState.volume === 'number' ? parsedAudioState.volume : 1,
    };
  } catch {
    return {
      currentTrack: null,
      queue: [],
      currentIndex: -1,
      volume: 1,
    };
  }
};

export const AudioProvider = ({ children }) => {
  const storedAudioState = getStoredAudioState();
  const [currentTrack, setCurrentTrack] = useState(storedAudioState.currentTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(storedAudioState.volume);
  const [queue, setQueue] = useState(storedAudioState.queue);
  const [currentIndex, setCurrentIndex] = useState(storedAudioState.currentIndex);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState(() => Array.from({ length: WAVEFORM_BAR_COUNT }, () => 6));
  
  // Инициализируем нативный объект Audio через useRef (ООП в функциональных компонентах)
  const audioRef = useRef(new Audio());
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const frequencyDataRef = useRef(null);
  const animationFrameRef = useRef(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.preload = 'auto';
  }, []);

  useEffect(() => {
    if (currentTrack?.src) {
      audioRef.current.src = currentTrack.src;
    }
  }, []);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  const stopWaveformAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const startWaveformAnimation = () => {
    const analyser = analyserRef.current;
    const frequencyData = frequencyDataRef.current;

    if (!analyser || !frequencyData) {
      return;
    }

    const renderWaveform = () => {
      analyser.getByteFrequencyData(frequencyData);

      const chunkSize = Math.max(1, Math.floor(frequencyData.length / WAVEFORM_BAR_COUNT));
      const levels = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, barIndex) => {
        const start = barIndex * chunkSize;
        const end = barIndex === WAVEFORM_BAR_COUNT - 1 ? frequencyData.length : start + chunkSize;

        let total = 0;
        let samples = 0;

        for (let i = start; i < end; i += 1) {
          total += frequencyData[i];
          samples += 1;
        }

        const average = samples > 0 ? total / samples : 0;
        const normalized = Math.pow(average / 255, 1.55);
        const targetLevel = 8 + normalized * 64;
        const previousLevel = waveformLevels[barIndex] ?? 8;
        const nextLevel = targetLevel > previousLevel
          ? targetLevel
          : previousLevel * 0.88 + targetLevel * 0.12;

        return Math.max(8, Math.min(72, Math.round(nextLevel)));
      });

      setWaveformLevels(levels);
      animationFrameRef.current = requestAnimationFrame(renderWaveform);
    };

    stopWaveformAnimation();
    animationFrameRef.current = requestAnimationFrame(renderWaveform);
  };

  const ensureAnalyser = () => {
    if (typeof window === 'undefined') {
      return false;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return false;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      analyserRef.current.smoothingTimeConstant = 0.82;
      frequencyDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }

    if (!sourceNodeRef.current) {
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    return true;
  };

  const loadTrackSource = async (trackSrc) => {
    if (!trackSrc) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    try {
      const response = await fetch(trackSrc);

      if (!response.ok) {
        throw new Error('Failed to load audio preview');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      audioRef.current.src = objectUrl;
    } catch {
      audioRef.current.src = trackSrc;
    }
  };

  const resumeAudioContext = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  useEffect(() => {
    localStorage.setItem(
      'audioState',
      JSON.stringify({ currentTrack, queue, currentIndex, volume })
    );
  }, [currentTrack, queue, currentIndex, volume]);

  useEffect(() => () => {
    stopWaveformAnimation();

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    // Слушатели событий аудио-потока
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      if (isRepeat && currentTrack) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      handleNext();
    };

    const onPlay = () => startWaveformAnimation();
    const onPause = () => stopWaveformAnimation();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentTrack, isRepeat, queue, currentIndex, isShuffle]);

  const playTrack = async (track, trackList = queue) => {
    if (!track) return;

    ensureAnalyser();
    void resumeAudioContext();

    if (Array.isArray(trackList) && trackList.length > 0) {
      setQueue(trackList);
      const index = trackList.findIndex((item) => item.id === track.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
    
    setCurrentTrack(track);
    await loadTrackSource(track.src);
    audioRef.current.currentTime = 0;
    
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(err => {
        stopWaveformAnimation();
        console.log("Ошибка воспроизведения:", err);
      });
  };

  const playTrackAtIndex = async (index) => {
    if (!queue.length) return;

    const normalizedIndex = ((index % queue.length) + queue.length) % queue.length;
    const track = queue[normalizedIndex];

    setCurrentIndex(normalizedIndex);
    setCurrentTrack(track);
    await loadTrackSource(track.src);
    audioRef.current.currentTime = 0;
    ensureAnalyser();
    void resumeAudioContext();
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(err => {
        stopWaveformAnimation();
        console.log("Ошибка воспроизведения:", err);
      });
  };

  const handleNext = () => {
    if (!queue.length) return;

    if (isShuffle) {
      let nextIndex = currentIndex;
      if (queue.length > 1) {
        while (nextIndex === currentIndex) {
          nextIndex = Math.floor(Math.random() * queue.length);
        }
      }
      playTrackAtIndex(nextIndex);
      return;
    }

    if (currentIndex < queue.length - 1) {
      playTrackAtIndex(currentIndex + 1);
      return;
    }

    if (isRepeat) {
      playTrackAtIndex(0);
    }
  };

  const handlePrev = () => {
    if (!queue.length) return;

    if (isShuffle) {
      let prevIndex = currentIndex;
      if (queue.length > 1) {
        while (prevIndex === currentIndex) {
          prevIndex = Math.floor(Math.random() * queue.length);
        }
      }
      playTrackAtIndex(prevIndex);
      return;
    }

    if (currentIndex > 0) {
      playTrackAtIndex(currentIndex - 1);
      return;
    }

    if (isRepeat) {
      playTrackAtIndex(queue.length - 1);
    }
  };

  const pauseTrack = () => {
    audioRef.current.pause();
    setIsPlaying(false);
    stopWaveformAnimation();
  };

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const setVolume = (nextVolume) => {
    const normalizedVolume = Math.min(1, Math.max(0, Number(nextVolume)));
    setVolumeState(normalizedVolume);
    audioRef.current.volume = normalizedVolume;
  };

  return (
    <AudioContext.Provider value={{ 
      currentTrack, isPlaying, currentTime, duration, volume, isShuffle, isRepeat,
        waveformLevels, playTrack, pauseTrack, seek, handleNext, handlePrev, setIsShuffle, setIsRepeat, setVolume 
    }}>
      {children}
    </AudioContext.Provider>
  );
};