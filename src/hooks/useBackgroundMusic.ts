import { useState, useEffect, useCallback, useRef } from 'react';

interface BackgroundMusicOptions {
  volume?: number;
  autoStart?: boolean;
}

const useBackgroundMusic = (musicUrl: string, options: BackgroundMusicOptions = {}) => {
  const { volume = 0.3, autoStart = false } = options;
  
  const [music, setMusic] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(autoStart);
  const initialized = useRef(false);

  // Initialize the audio element
  useEffect(() => {
    const audioElement = new Audio(musicUrl);
    audioElement.loop = true;
    audioElement.volume = volume;
    audioElement.preload = 'auto';
    
    setMusic(audioElement);

    // Load user preference from localStorage if available
    const savedMuteState = localStorage.getItem('gleeMusicMuted');
    if (savedMuteState) {
      setIsMuted(savedMuteState === 'true');
    }

    // Cleanup function
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [musicUrl, volume]);

  // Apply mute settings when they change
  useEffect(() => {
    if (music) {
      music.muted = isMuted;
      localStorage.setItem('gleeMusicMuted', isMuted.toString());
    }
  }, [isMuted, music]);

  // Play music when user interacts and music is loaded
  useEffect(() => {
    if (music && hasInteracted && !initialized.current) {
      const playPromise = music.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            initialized.current = true;
          })
          .catch(error => {
            console.error("Background music failed to start:", error);
          });
      }
    }
  }, [music, hasInteracted]);

  const play = useCallback(() => {
    if (music && !isPlaying) {
      const playPromise = music.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error("Background music failed to start:", error);
          });
      }
    }
  }, [music, isPlaying]);

  const pause = useCallback(() => {
    if (music && isPlaying) {
      music.pause();
      setIsPlaying(false);
    }
  }, [music, isPlaying]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Function to mark that user has interacted
  const userInteracted = useCallback(() => {
    setHasInteracted(true);
  }, []);

  return { 
    play, 
    pause, 
    togglePlay, 
    isPlaying, 
    isMuted, 
    toggleMute,
    userInteracted
  };
};

export default useBackgroundMusic;
