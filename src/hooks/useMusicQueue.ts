import { useState, useCallback } from "react";

interface Song {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

export const useMusicQueue = () => {
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [originalQueue, setOriginalQueue] = useState<Song[]>([]);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
  }, []);

  const addMultipleToQueue = useCallback((songs: Song[]) => {
    setQueue(songs);
    setCurrentIndex(0);
  }, []);

  const removeFromQueue = useCallback((songId: string) => {
    setQueue((prev) => {
      const newQueue = prev.filter((song) => song.id !== songId);
      const removedIndex = prev.findIndex((song) => song.id === songId);
      
      if (removedIndex < currentIndex) {
        setCurrentIndex((idx) => Math.max(0, idx - 1));
      } else if (removedIndex === currentIndex) {
        // If we removed the current song, stay at same index (plays next song)
      }
      
      return newQueue;
    });
  }, [currentIndex]);

  const playNext = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, queue.length]);

  const playPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const playAtIndex = useCallback((index: number) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index);
    }
  }, [queue.length]);

  const shuffleQueue = useCallback(() => {
    if (!isShuffled) {
      // Save original queue
      setOriginalQueue([...queue]);
      
      // Shuffle algorithm (Fisher-Yates)
      const currentSong = queue[currentIndex];
      const otherSongs = queue.filter((_, idx) => idx !== currentIndex);
      
      for (let i = otherSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
      }
      
      const shuffled = currentIndex >= 0 ? [currentSong, ...otherSongs] : otherSongs;
      setQueue(shuffled);
      setCurrentIndex(currentIndex >= 0 ? 0 : -1);
      setIsShuffled(true);
    } else {
      // Restore original queue
      setQueue(originalQueue);
      const currentSong = queue[currentIndex];
      const newIndex = originalQueue.findIndex((song) => song.id === currentSong?.id);
      setCurrentIndex(newIndex >= 0 ? newIndex : 0);
      setIsShuffled(false);
      setOriginalQueue([]);
    }
  }, [isShuffled, queue, currentIndex, originalQueue]);

  const reorderQueue = useCallback((newQueue: Song[]) => {
    const currentSong = queue[currentIndex];
    setQueue(newQueue);
    
    // Update current index to match the new position of current song
    if (currentSong) {
      const newIndex = newQueue.findIndex((song) => song.id === currentSong.id);
      setCurrentIndex(newIndex);
    }
  }, [queue, currentIndex]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
    setIsShuffled(false);
    setOriginalQueue([]);
  }, []);

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;
  const hasNext = currentIndex < queue.length - 1;
  const hasPrevious = currentIndex > 0;

  return {
    queue,
    currentSong,
    currentIndex,
    isShuffled,
    hasNext,
    hasPrevious,
    addToQueue,
    addMultipleToQueue,
    removeFromQueue,
    playNext,
    playPrevious,
    playAtIndex,
    shuffleQueue,
    reorderQueue,
    clearQueue,
  };
};
