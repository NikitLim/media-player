// src/services/musicApi.js

export const musicApi = {
  async getTopTracks(searchQuery = 'synthwave') {
    try {
      // Честный сетевой запрос к внешнему API iTunes
      // Ограничение limit=25, чтобы треков было действительно МНОГО
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=song&limit=25`
      );
      
      if (!response.ok) throw new Error('Ошибка при запросе к API iTunes');
      
      const data = await response.json();
      
      // Маппим внешние данные под структуру нашего React-плеера
      return data.results.map((track) => ({
        id: track.trackId,
        title: track.trackName,
        artist: track.artistName,
        // Переводим миллисекунды от Apple API в привычный формат мм:сс
        duration: this.formatDuration(track.trackTimeMillis),
        src: track.previewUrl, // Реальная внешняя ссылка на mp3-файл (30 сек превью)
        cover: track.artworkUrl100.replace('100x100bb', '300x300bb') // Берем обложку в хорошем качестве
      }));
    } catch (error) {
      console.error("Честная ошибка API:", error);
      throw error;
    }
  },

  // Вспомогательный метод форматирования времени
  formatDuration(millis) {
    if (!millis) return '03:00';
    const totalSeconds = Math.floor(millis / 1000);
    const min = Math.floor(totalSeconds / 60);
    const sec = Math.floor(totalSeconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
};