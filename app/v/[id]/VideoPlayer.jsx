'use client';

import { useCallback, useRef } from 'react';

export default function VideoPlayer({ mediaUrl, poster, title }) {
  const videoRef = useRef(null);

  const openFallback = useCallback(() => {
    if (!mediaUrl) {
      return;
    }

    try {
      const el = videoRef.current;
      if (el && el.readyState >= 2 && !el.paused) {
        return;
      }
    } catch (error) {
      console.error('[VideoPlayer] Failed to inspect video element', error);
    }

    window.open(mediaUrl, '_blank', 'noopener');
  }, [mediaUrl]);

  const handleClick = useCallback(() => {
    const el = videoRef.current;
    if (!el) {
      openFallback();
      return;
    }

    const attemptPlay = () => {
      try {
        const promise = el.play();
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => openFallback());
        }
      } catch (error) {
        console.error('[VideoPlayer] play() failed, opening fallback', error);
        openFallback();
      }
    };

    if (el.readyState >= 2) {
      if (el.paused) {
        attemptPlay();
      }
      return;
    }

    const handleCanPlay = () => {
      el.removeEventListener('canplay', handleCanPlay);
      if (el.paused) {
        attemptPlay();
      }
    };

    el.addEventListener('canplay', handleCanPlay, { once: true });
    try {
      el.load();
    } catch (error) {
      console.error('[VideoPlayer] load() failed, opening fallback', error);
      el.removeEventListener('canplay', handleCanPlay);
      openFallback();
    }
  }, [openFallback]);

  const handleError = useCallback(() => {
    openFallback();
  }, [openFallback]);

  return (
    <video
      ref={videoRef}
      data-share-player="true"
      poster={poster}
      controls
      playsInline
      preload="metadata"
      className="w-full h-full object-contain"
      onClick={handleClick}
      onError={handleError}
    >
      <source src={mediaUrl} type="video/mp4" />
      <track kind="captions" label="Hebrew" />
      {title ? `${title} video playback not supported` : 'הדפדפן שלך לא תומך בהפעלת וידאו.'}
    </video>
  );
}
