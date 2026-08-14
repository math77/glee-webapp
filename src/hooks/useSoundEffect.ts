import { useState, useEffect, useCallback } from 'react';

const useSoundEffect = (soundUrl: string) => {
  const [sound, setSound] = useState<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Create audio element
    const audioElement = new Audio(soundUrl);
    audioElement.preload = 'auto';
    setSound(audioElement);

    // Load user preference from localStorage if available
    const savedMuteState = localStorage.getItem('gleeSoundMuted') ?? localStorage.getItem('bydedSoundMuted');
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
  }, [soundUrl]);

  // Update audio muted state when isMuted changes
  useEffect(() => {
    if (sound) {
      sound.muted = isMuted;
      // Save preference to localStorage
      localStorage.setItem('gleeSoundMuted', isMuted.toString());
    }
  }, [isMuted, sound]);

  const play = useCallback(() => {
    if (sound && !isMuted) {
      // Create a clone of the audio for overlapping sounds
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      
      // Play the cloned sound
      const playPromise = soundClone.play();
      
      // Handle promise to catch any autoplay restrictions
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Audio play failed:", error);
        });
      }
      
      // Auto-cleanup after playing
      soundClone.addEventListener('ended', () => {
        soundClone.remove();
      });
    }
  }, [sound, isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { play, isMuted, toggleMute };
};

export default useSoundEffect;
