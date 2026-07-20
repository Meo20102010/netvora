'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { useTranslation } from '@/i18n';
import {
  HiPlay,
  HiPause,
  HiSpeakerWave,
  HiSpeakerXMark,
  HiArrowsPointingOut,
  HiArrowsPointingIn,
  HiXMark,
  HiForward,
  HiBackward,
  HiChevronDoubleRight,
  HiClock,
  HiLanguage,
  HiPhoto,
  HiMiniWindow,
  HiCog6Tooth,
  HiMoon,
  HiBolt,
  HiOutlineChevronRight,
} from 'react-icons/hi2';

interface Chapter {
  time: number;
  title: string;
}

interface Subtitle {
  label: string;
  src: string;
  srclang: string;
}

interface QualityLevel {
  label: string;
  value: string;
  height?: number;
}

interface NextEpisode {
  id: string;
  title: string;
  seasonNumber: number;
  episodeNumber: number;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  type?: 'movie' | 'episode';
  contentId?: string;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  nextEpisode?: NextEpisode | null;
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  initialProgress?: number;
  chapters?: Chapter[];
  subtitles?: Subtitle[];
  onProgress?: (progress: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SEEK_STEP = 10;
const VOLUME_STEP = 0.05;
const CONTROLS_HIDE_DELAY = 3000;
const CLICK_DELAY = 300;
const NEXT_EPISODE_COUNTDOWN = 10;
const INTRO_APPEAR_DELAY = 5000;
const INTRO_AUTO_HIDE_DURATION = 15000;

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isEmbedUrl(url: string): boolean {
  const embedDomains = [
    'rapidvid.net',
    'vidmoly.to',
    'vidplay.net',
    'vidsrc.to',
    'embed',
    'trplayer.com',
    'sobreatsesuyp.com',
    'youtube.com',
    'youtu.be',
    'turkeyplayer.com',
    'vidmoxy',
    'youtube.com',
    'imgz.me',
    'dailymotion.com',
    'vk.com',
    'sobreatsesuyp.com',
  ];
  return embedDomains.some((d) => url.includes(d));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rewriteProxyUrl(url: string): string {
  if (url.includes('kanald') || url.includes('duhnet')) {
    return `/api/proxy/vod/${encodeURIComponent(url)}`;
  }
  return url;
}

export default function VideoPlayer({
  src,
  poster,
  title,
  type,
  contentId,
  episodeId,
  seasonNumber,
  episodeNumber,
  nextEpisode,
  introStart,
  introEnd,
  outroStart,
  initialProgress,
  chapters,
  subtitles,
  onProgress,
  onEnded,
  onPlay,
  onPause,
  className,
}: VideoPlayerProps) {
  const { t } = useTranslation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextCountdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioConnectedRef = useRef(false);
  const gestureStartRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const initialProgressAppliedRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const savedVolumeRef = useRef(1);
  const introShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introAutoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPiP, setIsPiP] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [activeQuality, setActiveQuality] = useState('auto');
  const [bufferedPct, setBufferedPct] = useState(0);
  const [isIntroVisible, setIsIntroVisible] = useState(false);
  const [isOutroVisible, setIsOutroVisible] = useState(false);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(NEXT_EPISODE_COUNTDOWN);
  const [activeSubtitle, setActiveSubtitle] = useState('');
  const [hlsLevels, setHlsLevels] = useState<QualityLevel[]>([]);
  const [seekIndicator, setSeekIndicator] = useState<number | null>(null);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isAudioBoost, setIsAudioBoost] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showControlsOverlay, setShowControlsOverlay] = useState(false);
  const [touchGestureIndicator, setTouchGestureIndicator] = useState<{
    type: 'volume' | 'brightness';
    value: number;
  } | null>(null);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedWidth = duration > 0 ? Math.min(bufferedPct, 100) : 0;

  const isHls = src.includes('.m3u8');
  const processedSrc = useMemo(() => rewriteProxyUrl(src), [src]);

  useEffect(() => {
    pendingSeekRef.current = null;
    initialProgressAppliedRef.current = false;
  }, [src]);

  useEffect(() => {
    if (initialProgress && initialProgress > 0) {
      pendingSeekRef.current = initialProgress;
      initialProgressAppliedRef.current = false;
    }
  }, [initialProgress]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (nextCountdownTimerRef.current)
        clearInterval(nextCountdownTimerRef.current);
      if (introShowTimerRef.current) clearTimeout(introShowTimerRef.current);
      if (introAutoHideTimerRef.current)
        clearTimeout(introAutoHideTimerRef.current);
    };
  }, []);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
        setShowSubtitleMenu(false);
        setShowSettingsMenu(false);
        setShowVolumeSlider(false);
      }
    }, CONTROLS_HIDE_DELAY);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMouseMove = () => resetHideTimer();
    const onMouseLeave = () => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
        setShowSubtitleMenu(false);
        setShowSettingsMenu(false);
        setShowVolumeSlider(false);
      }
      setHoverTime(null);
    };

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);
    return () => {
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [isPlaying, resetHideTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !processedSrc || isEmbedUrl(processedSrc)) return;

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });
        hlsRef.current = hls;
        hls.loadSource(processedSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          const levels: QualityLevel[] = hls.levels.map((level, i) => {
            let label: string;
            if (level.height >= 1440) label = `${level.height}p (2K)`;
            else if (level.height >= 1080) label = '1080p';
            else if (level.height >= 720) label = '720p';
            else if (level.height >= 480) label = '480p';
            else if (level.height >= 360) label = '360p';
            else label = `${level.height}p`;
            return { label, value: String(i), height: level.height };
          });
          setHlsLevels(levels);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
          setActiveQuality(String(data.level));
        });

        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            }
          }
        });
      } else if (
        video.canPlayType('application/vnd.apple.mpegurl')
      ) {
        video.src = processedSrc;
      }
    } else {
      video.src = processedSrc;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [processedSrc, isHls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !processedSrc || isEmbedUrl(processedSrc)) return;

    const onLoaded = () => {
      if (
        !initialProgressAppliedRef.current &&
        pendingSeekRef.current !== null &&
        pendingSeekRef.current > 0
      ) {
        video.currentTime = pendingSeekRef.current;
        initialProgressAppliedRef.current = true;
        pendingSeekRef.current = null;
      }
    };

    video.addEventListener('loadeddata', onLoaded);
    return () => video.removeEventListener('loadeddata', onLoaded);
  }, [processedSrc]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = clamp(volume, 0, 1);
    }
  }, [volume]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && video.buffered.length > 0) {
        const end = video.buffered.end(video.buffered.length - 1);
        const pct =
          video.duration > 0 ? (end / video.duration) * 100 : 0;
        setBufferedPct(pct);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (
      introStart === undefined ||
      introEnd === undefined ||
      duration === 0
    ) {
      setIsIntroVisible(false);
      return;
    }

    const isIntroRange = currentTime >= introStart && currentTime < introEnd;

    if (isIntroRange && !isIntroVisible) {
      introShowTimerRef.current = setTimeout(() => {
        setIsIntroVisible(true);
        introAutoHideTimerRef.current = setTimeout(() => {
          setIsIntroVisible(false);
        }, INTRO_AUTO_HIDE_DURATION);
      }, INTRO_APPEAR_DELAY);
    } else if (!isIntroRange) {
      setIsIntroVisible(false);
      if (introShowTimerRef.current)
        clearTimeout(introShowTimerRef.current);
      if (introAutoHideTimerRef.current)
        clearTimeout(introAutoHideTimerRef.current);
    }

    return () => {
      if (introShowTimerRef.current)
        clearTimeout(introShowTimerRef.current);
      if (introAutoHideTimerRef.current)
        clearTimeout(introAutoHideTimerRef.current);
    };
  }, [currentTime, introStart, introEnd, duration]);

  useEffect(() => {
    if (!outroStart || duration === 0) {
      setIsOutroVisible(false);
      return;
    }
    setIsOutroVisible(currentTime >= outroStart && currentTime < duration);
  }, [currentTime, outroStart, duration]);

  useEffect(() => {
    if (
      showNextEpisode &&
      isPlaying &&
      nextCountdown > 0 &&
      nextEpisode &&
      onEnded
    ) {
      nextCountdownTimerRef.current = setInterval(() => {
        setNextCountdown((prev) => {
          if (prev <= 1) {
            if (nextCountdownTimerRef.current)
              clearInterval(nextCountdownTimerRef.current);
            setShowNextEpisode(false);
            onEnded();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (nextCountdownTimerRef.current)
          clearInterval(nextCountdownTimerRef.current);
      };
    }
  }, [showNextEpisode, isPlaying, nextEpisode]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(SEEK_STEP);
          showSeekIndicator(1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-SEEK_STEP);
          showSeekIndicator(-1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(VOLUME_STEP);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-VOLUME_STEP);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          if (subtitles && subtitles.length > 0) {
            toggleNextSubtitle();
          }
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePiP();
          break;
        case '<':
          e.preventDefault();
          changeSpeed(-1);
          break;
        case '>':
          e.preventDefault();
          changeSpeed(1);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          seekToPercent(parseInt(e.key) * 10);
          break;
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isFullscreen, subtitles, playbackRate, volume]);

  useEffect(() => {
    if (!onProgress || !isPlaying) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && video.duration) {
        onProgress(video.currentTime, video.duration);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [onProgress, isPlaying]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnterPiP = () => setIsPiP(true);
    const onLeavePiP = () => setIsPiP(false);
    video.addEventListener('enterpictureinpicture', onEnterPiP);
    video.addEventListener('leavepictureinpicture', onLeavePiP);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPiP);
      video.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video || isPiP) return;
        if (!entry.isIntersecting && isPlaying && !video.paused) {
          togglePiP();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isPlaying, isPiP]);

  useEffect(() => {
    if (!isAudioBoost) {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 1;
      }
      return;
    }

    const setupAudioBoost = async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;

        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        if (!audioConnectedRef.current) {
          const source = ctx.createMediaElementSource(video);
          const gain = ctx.createGain();
          source.connect(gain);
          gain.connect(ctx.destination);
          sourceNodeRef.current = source;
          gainNodeRef.current = gain;
          audioConnectedRef.current = true;
        }

        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = 2;
        }
      } catch {
        setIsAudioBoost(false);
      }
    };

    setupAudioBoost();
  }, [isAudioBoost]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          onPlay?.();
        })
        .catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      onPause?.();
    }
    resetHideTimer();
  }, [onPlay, onPause, resetHideTimer]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted) {
      video.muted = false;
      setIsMuted(false);
      if (savedVolumeRef.current > 0) {
        video.volume = savedVolumeRef.current;
        setVolume(savedVolumeRef.current);
      }
    } else {
      savedVolumeRef.current = video.volume;
      video.muted = true;
      setIsMuted(true);
    }
  }, []);

  const changeVolume = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      const newVol = clamp(volume + delta, 0, 1);
      video.volume = newVol;
      video.muted = newVol === 0;
      setVolume(newVol);
      setIsMuted(newVol === 0);
      if (newVol > 0) savedVolumeRef.current = newVol;
      resetHideTimer();
    },
    [volume, resetHideTimer]
  );

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.volume = val;
      video.muted = val === 0;
    }
    setVolume(val);
    setIsMuted(val === 0);
    if (val > 0) savedVolumeRef.current = val;
  };

  const seekRelative = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video || !isFinite(video.duration)) return;
      video.currentTime = clamp(
        video.currentTime + seconds,
        0,
        video.duration
      );
      resetHideTimer();
    },
    [resetHideTimer]
  );

  const seekToPercent = useCallback(
    (pct: number) => {
      const video = videoRef.current;
      if (!video || !isFinite(video.duration)) return;
      video.currentTime = (pct / 100) * video.duration;
      resetHideTimer();
    },
    [resetHideTimer]
  );

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar || !isFinite(video.duration)) return;
    const rect = bar.getBoundingClientRect();
    const pct = clamp(
      (e.clientX - rect.left) / rect.width,
      0,
      1
    );
    video.currentTime = pct * video.duration;
  }, []);

  const changeSpeed = useCallback(
    (direction: number) => {
      const video = videoRef.current;
      if (!video) return;
      const idx = SPEEDS.indexOf(playbackRate);
      const nextIdx = clamp(idx + direction, 0, SPEEDS.length - 1);
      const nextSpeed = SPEEDS[nextIdx];
      video.playbackRate = nextSpeed;
      setPlaybackRate(nextSpeed);
      resetHideTimer();
    },
    [playbackRate, resetHideTimer]
  );

  const setSpeed = useCallback(
    (speed: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = speed;
      setPlaybackRate(speed);
      setShowSpeedMenu(false);
      resetHideTimer();
    },
    [resetHideTimer]
  );

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // fullscreen not supported or denied
    }
    resetHideTimer();
  }, [resetHideTimer]);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // PiP not supported
    }
    resetHideTimer();
  }, [resetHideTimer]);

  const toggleNextSubtitle = useCallback(() => {
    if (!subtitles || subtitles.length === 0) return;

    const tracks = videoRef.current?.textTracks;
    if (!tracks) return;

    const currentIdx = subtitles.findIndex(
      (s) => s.srclang === activeSubtitle
    );
    const nextIdx = currentIdx + 1;

    if (nextIdx >= subtitles.length) {
      setActiveSubtitle('');
      Array.from(tracks).forEach((tr) => {
        tr.mode = 'hidden';
      });
    } else {
      const next = subtitles[nextIdx];
      setActiveSubtitle(next.srclang);
      Array.from(tracks).forEach((tr) => {
        tr.mode = tr.language === next.srclang ? 'showing' : 'hidden';
      });
    }
    resetHideTimer();
  }, [subtitles, activeSubtitle, resetHideTimer]);

  const setSubtitle = useCallback(
    (srclang: string) => {
      const tracks = videoRef.current?.textTracks;
      if (!tracks) return;
      if (!srclang) {
        setActiveSubtitle('');
        Array.from(tracks).forEach((tr) => {
          tr.mode = 'hidden';
        });
      } else {
        setActiveSubtitle(srclang);
        Array.from(tracks).forEach((tr) => {
          tr.mode =
            tr.language === srclang ? 'showing' : 'hidden';
        });
      }
      setShowSubtitleMenu(false);
      resetHideTimer();
    },
    [resetHideTimer]
  );

  const skipIntro = useCallback(() => {
    const video = videoRef.current;
    if (!video || introEnd === undefined) return;
    video.currentTime = introEnd;
    setIsIntroVisible(false);
  }, [introEnd]);

  const skipOutro = useCallback(() => {
    const video = videoRef.current;
    if (!video || !duration) return;
    if (nextEpisode && onEnded) {
      setShowNextEpisode(true);
      setNextCountdown(NEXT_EPISODE_COUNTDOWN);
    } else {
      video.currentTime = duration;
    }
  }, [nextEpisode, onEnded, duration]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      setLoading(false);
    }
  }, []);

  const handleWaiting = useCallback(() => setLoading(true), []);
  const handleCanPlay = useCallback(() => setLoading(false), []);
  const handleError = useCallback(() => {
    setError(t('player.load_error'));
    setLoading(false);
  }, [t]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setShowControls(true);
    if (nextEpisode) {
      setShowNextEpisode(true);
      setNextCountdown(NEXT_EPISODE_COUNTDOWN);
    }
    onEnded?.();
  }, [onEnded, nextEpisode]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const showSeekIndicator = useCallback((dir: number) => {
    setSeekIndicator(dir);
    setTimeout(() => setSeekIndicator(null), 800);
  }, []);

  const handleSingleClick = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickTimerRef.current = setTimeout(() => {
      togglePlay();
      clickTimerRef.current = null;
    }, CLICK_DELAY);
  }, [togglePlay]);

  const handleDoubleClick = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    toggleFullscreen();
  }, [toggleFullscreen]);

  const handleProgressHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      if (!bar || !isFinite(duration)) return;
      const rect = bar.getBoundingClientRect();
      const pct = clamp(
        (e.clientX - rect.left) / rect.width,
        0,
        1
      );
      setHoverTime(pct * duration);
      setHoverPct(pct * 100);
    },
    [duration]
  );

  const handleProgressLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    gestureStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    longPressTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        setIsLongPressing(true);
        video.playbackRate = 2;
      }
    }, 500);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!gestureStartRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - gestureStartRef.current.x;
      const dy = touch.clientY - gestureStartRef.current.y;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const isLeftSide =
        gestureStartRef.current.x - rect.left < rect.width / 2;

      if (Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx)) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        e.preventDefault();

        if (isLeftSide) {
          const delta = -dy / rect.height;
          const newVol = clamp(
            (videoRef.current?.volume ?? volume) + delta,
            0,
            1
          );
          if (videoRef.current) {
            videoRef.current.volume = newVol;
            videoRef.current.muted = newVol === 0;
          }
          setVolume(newVol);
          setIsMuted(newVol === 0);
          setTouchGestureIndicator({
            type: 'volume',
            value: Math.round(newVol * 100),
          });
          setTimeout(() => setTouchGestureIndicator(null), 600);
        } else {
          const delta = (-dy / rect.height) * 0.5;
          setBrightness((prev) => {
            const newVal = clamp(prev + delta, 0.1, 1.5);
            setTouchGestureIndicator({
              type: 'brightness',
              value: Math.round(newVal * 100),
            });
            setTimeout(
              () => setTouchGestureIndicator(null),
              600
            );
            return newVal;
          });
        }
      }
    },
    [volume]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isLongPressing) {
        const video = videoRef.current;
        if (video) {
          video.playbackRate = playbackRate;
        }
        setIsLongPressing(false);
        return;
      }

      if (!gestureStartRef.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - gestureStartRef.current.x;
      const dy = touch.clientY - gestureStartRef.current.y;
      const elapsed =
        Date.now() - gestureStartRef.current.time;

      if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && elapsed < 300) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;
        lastTapRef.current = now;

        if (timeSinceLastTap < 300) {
          const tapX = touch.clientX - rect.left;
          const isLeftSide = tapX < rect.width / 2;
          if (isLeftSide) {
            seekRelative(-SEEK_STEP);
            showSeekIndicator(-1);
          } else {
            seekRelative(SEEK_STEP);
            showSeekIndicator(1);
          }
          lastTapRef.current = 0;
        } else {
          handleSingleClick();
        }
      }

      gestureStartRef.current = null;
    },
    [
      isLongPressing,
      playbackRate,
      seekRelative,
      showSeekIndicator,
      handleSingleClick,
    ]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      gestureStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      };

      longPressTimerRef.current = setTimeout(() => {
        const video = videoRef.current;
        if (video && !video.paused) {
          setIsLongPressing(true);
          video.playbackRate = 2;
        }
      }, 500);
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isLongPressing) {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = playbackRate;
      }
      setIsLongPressing(false);
    }

    gestureStartRef.current = null;
  }, [isLongPressing, playbackRate]);

  const closeAllMenus = useCallback(() => {
    setShowSpeedMenu(false);
    setShowQualityMenu(false);
    setShowSubtitleMenu(false);
    setShowSettingsMenu(false);
  }, []);

  if (!src) {
    return (
      <div
        className={`w-full aspect-video bg-black flex items-center justify-center ${className || ''}`}
      >
        <div className="text-center text-[#555]">
          <HiPhoto className="w-12 h-12 mx-auto mb-2" />
          <p className="text-sm">{t('player.no_source')}</p>
        </div>
      </div>
    );
  }

  if (isEmbedUrl(src)) {
    return (
      <div
        className={`relative w-full aspect-video bg-black ${className || ''}`}
      >
        <iframe
          src={src}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; encrypted-media"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    );
  }

  const ProgressBar = () => (
    <div
      ref={progressRef}
      className="relative w-full h-1.5 md:h-[5px] bg-white/20 rounded-full mb-3 cursor-pointer group/progress hover:h-2 md:hover:h-[7px] transition-all duration-200"
      onClick={handleSeek}
      onMouseMove={handleProgressHover}
      onMouseLeave={handleProgressLeave}
      role="slider"
      aria-label={t('player.progress') || 'Video progress'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progressPct)}
      tabIndex={0}
    >
      <div
        className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
        style={{ width: `${bufferedWidth}%` }}
      />

      {chapters &&
        chapters.length > 0 &&
        chapters.map((chapter, i) => {
          const chapterPct = (chapter.time / duration) * 100;
          const nextChapter = chapters[i + 1];
          const endPct = nextChapter
            ? (nextChapter.time / duration) * 100
            : 100;
          return (
            <div
              key={`ch-${chapter.time}-${i}`}
              className="absolute top-0 h-full bg-white/5 rounded-full"
              style={{
                left: `${chapterPct}%`,
                width: `${endPct - chapterPct}%`,
              }}
              title={chapter.title}
            />
          );
        })}

      {chapters &&
        chapters.length > 0 &&
        chapters.map((chapter, i) => {
          if (i === 0) return null;
          const chapterPct = (chapter.time / duration) * 100;
          return (
            <div
              key={`mk-${chapter.time}-${i}`}
              className="absolute top-0 h-full w-[3px] bg-white/40 rounded-full z-[1] hidden md:block"
              style={{ left: `${chapterPct}%` }}
              title={chapter.title}
            />
          );
        })}

      <div
        className="absolute top-0 left-0 h-full bg-[#E50914] rounded-full transition-[width] duration-75"
        style={{ width: `${progressPct}%` }}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 rounded-full bg-white shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity scale-0 group-hover/progress:scale-100" />
      </div>

      {hoverTime !== null && (
        <div
          className="absolute bottom-full mb-3 -translate-x-1/2 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono shadow-xl pointer-events-none z-30"
          style={{ left: `${hoverPct}%` }}
        >
          {formatTime(hoverTime)}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a1a]/95 rotate-45 -mt-1 border-r border-b border-white/10" />
        </div>
      )}
    </div>
  );

  const VolumeControl = () => (
    <div
      className="relative"
      onMouseEnter={() => setShowVolumeSlider(true)}
      onMouseLeave={() => setShowVolumeSlider(false)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
        className="text-white/80 hover:text-white transition-colors p-1.5"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted || volume === 0 ? (
          <HiSpeakerXMark className="w-5 h-5" />
        ) : (
          <HiSpeakerWave className="w-5 h-5" />
        )}
      </button>

      <div
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-lg p-2 shadow-xl transition-all duration-200 ${
          showVolumeSlider
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible translate-y-2'
        }`}
      >
        <div
          className="relative w-1 h-24 bg-white/20 rounded-full cursor-pointer group/vol"
          onClick={(e) => {
            e.stopPropagation();
            const rect =
              e.currentTarget.getBoundingClientRect();
            const pct = clamp(
              1 - (e.clientY - rect.top) / rect.height,
              0,
              1
            );
            const video = videoRef.current;
            if (video) {
              video.volume = pct;
              video.muted = pct === 0;
            }
            setVolume(pct);
            setIsMuted(pct === 0);
            if (pct > 0) savedVolumeRef.current = pct;
          }}
        >
          <div
            className="absolute bottom-0 left-0 w-full bg-[#E50914] rounded-full transition-all"
            style={{
              height: `${(isMuted ? 0 : volume) * 100}%`,
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-all group-hover/vol:scale-110"
            style={{
              bottom: `calc(${(isMuted ? 0 : volume) * 100}% - 6px)`,
            }}
          />
        </div>
        <div className="text-center mt-1.5">
          <span className="text-[10px] text-white/50 font-mono">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black group select-none overflow-hidden ${
        isFullscreen ? 'aspect-auto' : 'aspect-video'
      } ${className || ''}`}
      role="application"
      aria-label={title || 'Video Player'}
      onMouseMove={resetHideTimer}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        style={{
          filter: [
            isNightMode
              ? 'brightness(0.7) saturate(0.85)'
              : null,
            brightness !== 1
              ? `brightness(${brightness})`
              : null,
          ]
            .filter(Boolean)
            .join(' ') || undefined,
        }}
        onClick={() => {
          handleSingleClick();
          resetHideTimer();
        }}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      >
        {subtitles?.map((sub) => (
          <track
            key={sub.src}
            kind="subtitles"
            src={sub.src}
            label={sub.label}
            srcLang={sub.srclang}
          />
        ))}
      </video>

      {isNightMode && (
        <div className="absolute inset-0 pointer-events-none z-[1] bg-[#1a0a00]/20 mix-blend-multiply" />
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="relative">
            <div className="w-14 h-14 border-[3px] border-white/10 border-t-[#E50914] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-6 h-6 border-[3px] border-white/5 border-b-[#E50914] rounded-full animate-spin"
                style={{ animationDelay: '150ms' }}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center">
            <HiXMark className="w-14 h-14 text-[#E50914] mx-auto mb-3" />
            <p className="text-base text-[#b3b3b3]">{error}</p>
          </div>
        </div>
      )}

      {seekIndicator !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-black/60 rounded-full p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {seekIndicator > 0 ? (
                <>
                  <HiForward className="w-8 h-8 text-white" />
                  <span className="text-white font-bold text-lg">
                    +{SEEK_STEP}s
                  </span>
                </>
              ) : (
                <>
                  <HiBackward className="w-8 h-8 text-white" />
                  <span className="text-white font-bold text-lg">
                    -{SEEK_STEP}s
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isLongPressing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-[#E50914]/90 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
            <HiBolt className="w-4 h-4" />
            2x {t('watch.speed')}
          </div>
        </div>
      )}

      {touchGestureIndicator && (
        <div className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none left-1/2 -translate-x-1/2">
          <div className="bg-black/70 backdrop-blur-sm text-white px-5 py-3 rounded-xl text-center shadow-2xl">
            <div className="text-3xl font-bold mb-1">
              {touchGestureIndicator.value}%
            </div>
            <div className="text-xs text-white/60 uppercase tracking-wider">
              {touchGestureIndicator.type === 'volume'
                ? t('player.volume')
                : t('player.brightness')}
            </div>
          </div>
        </div>
      )}

      {!isPlaying && !loading && !error && !showNextEpisode && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#E50914] blur-2xl opacity-30 animate-pulse" />
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-[#E50914]/90 shadow-2xl">
              <HiPlay className="w-8 h-8 md:w-10 md:h-10 text-white ml-1 drop-shadow-lg" />
            </div>
          </div>
        </div>
      )}

      {isIntroVisible && introEnd !== undefined && (
        <div className="absolute bottom-24 right-4 z-20 animate-slide-up">
          <button
            onClick={(e) => {
              e.stopPropagation();
              skipIntro();
            }}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95"
          >
            <div className="flex items-center gap-2">
              <HiChevronDoubleRight className="w-4 h-4" />
              <span>{t('watch.skip_intro')}</span>
            </div>
          </button>
        </div>
      )}

      {isOutroVisible && (
        <div className="absolute bottom-24 right-4 z-20 animate-slide-up">
          <button
            onClick={(e) => {
              e.stopPropagation();
              skipOutro();
            }}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95"
          >
            <div className="flex items-center gap-2">
              <HiChevronDoubleRight className="w-4 h-4" />
              <span>{t('watch.skip_recap')}</span>
            </div>
          </button>
        </div>
      )}

      {showNextEpisode && nextEpisode && (
        <div
          className="absolute inset-0 z-20 bg-black/70 flex items-end justify-center pb-20 backdrop-blur-[2px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center animate-slide-up w-full max-w-md px-4">
            <p className="text-xl font-bold text-white mb-1">
              {t('watch.next_episode')}
            </p>
            {nextEpisode.title && (
              <p className="text-sm text-[#b3b3b3] mb-1">
                S{nextEpisode.seasonNumber}:E
                {nextEpisode.episodeNumber} -{' '}
                {nextEpisode.title}
              </p>
            )}
            <p className="text-sm text-[#808080] mb-5">
              {nextCountdown}{' '}
              {t('player.starting_in')}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowNextEpisode(false);
                  onEnded?.();
                }}
                className="bg-[#E50914] hover:bg-[#f40612] text-white px-8 py-3 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#E50914]/20"
              >
                {t('player.watch_now')}
              </button>
              <button
                onClick={() => {
                  setShowNextEpisode(false);
                  if (nextCountdownTimerRef.current)
                    clearInterval(nextCountdownTimerRef.current);
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-bold text-sm transition-all border border-white/10 hover:border-white/20"
              >
                {t('common.cancel')}
              </button>
            </div>
            <div className="mt-4 w-full bg-white/10 rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-[#E50914] transition-all duration-1000 ease-linear"
                style={{
                  width: `${((NEXT_EPISODE_COUNTDOWN - nextCountdown) / NEXT_EPISODE_COUNTDOWN) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-500 ease-out ${
          showControls
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 via-40% to-transparent pointer-events-none" />

        <div className="relative px-3 pb-2 pt-14 md:px-5 md:pb-3">
          <ProgressBar />

          <div className="flex items-center justify-between gap-1.5 md:gap-2">
            <div className="flex items-center gap-0.5 md:gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="text-white hover:text-[#E50914] transition-colors p-1.5"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <HiPause className="w-5 h-5 md:w-6 md:h-6" />
                ) : (
                  <HiPlay className="w-5 h-5 md:w-6 md:h-6" />
                )}
              </button>

              {nextEpisode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnded?.();
                  }}
                  className="text-white/70 hover:text-white transition-colors p-1.5 hidden md:block"
                  aria-label={t('watch.next_episode')}
                >
                  <HiOutlineChevronRight className="w-5 h-5" />
                </button>
              )}

              <VolumeControl />

              <span className="text-xs md:text-sm text-white/70 font-medium tabular-nums ml-0.5 hidden sm:inline">
                {formatTime(currentTime)}
                <span className="text-white/30 mx-0.5">
                  /
                </span>
                {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-0.5 md:gap-1">
              {subtitles && subtitles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeAllMenus();
                      setShowSubtitleMenu(!showSubtitleMenu);
                    }}
                    className={`text-white/80 hover:text-white transition-colors p-1.5 ${
                      activeSubtitle
                        ? 'text-[#E50914]'
                        : ''
                    }`}
                    aria-label="Subtitles"
                  >
                    <HiLanguage className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  {showSubtitleMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl py-1.5 min-w-[160px] shadow-2xl animate-scale-in origin-bottom-right z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubtitle('');
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                          !activeSubtitle
                            ? 'text-[#E50914] font-medium'
                            : 'text-white/80'
                        }`}
                      >
                        {t('common.cancel')} (
                        {t('watch.off')})
                      </button>
                      {subtitles.map((sub) => (
                        <button
                          key={sub.src}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubtitle(sub.srclang);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                            activeSubtitle === sub.srclang
                              ? 'text-[#E50914] font-medium'
                              : 'text-white/80'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeAllMenus();
                    setShowSpeedMenu(!showSpeedMenu);
                  }}
                  className="text-white/80 hover:text-white transition-colors p-1.5 flex items-center gap-1"
                  aria-label="Playback speed"
                >
                  <HiClock className="w-4 h-4 md:w-5 md:h-5" />
                  {playbackRate !== 1 && (
                    <span className="text-[10px] md:text-xs font-bold text-[#E50914]">
                      {playbackRate}x
                    </span>
                  )}
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl py-1.5 min-w-[110px] shadow-2xl animate-scale-in origin-bottom-right z-30">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpeed(s);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors flex items-center justify-between ${
                          playbackRate === s
                            ? 'text-[#E50914] font-medium'
                            : 'text-white/80'
                        }`}
                      >
                        <span>{s}x</span>
                        {playbackRate === s && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {hlsLevels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeAllMenus();
                      setShowQualityMenu(!showQualityMenu);
                    }}
                    className="text-white/80 hover:text-white transition-colors p-1.5 flex items-center gap-1"
                    aria-label="Quality"
                  >
                    <HiCog6Tooth className="w-4 h-4 md:w-5 md:h-5" />
                    {activeQuality !== 'auto' && (
                      <span className="text-[10px] hidden md:inline text-[#E50914] font-bold">
                        {
                          hlsLevels[parseInt(activeQuality)]
                            ?.label
                        }
                      </span>
                    )}
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl py-1.5 min-w-[140px] shadow-2xl animate-scale-in origin-bottom-right z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveQuality('auto');
                          if (hlsRef.current)
                            hlsRef.current.currentLevel = -1;
                          setShowQualityMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors flex items-center justify-between ${
                          activeQuality === 'auto'
                            ? 'text-[#E50914] font-medium'
                            : 'text-white/80'
                        }`}
                      >
                        <span>{t('player.auto')}</span>
                        {activeQuality === 'auto' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />
                        )}
                      </button>
                      {hlsLevels.map((q) => {
                        const levelIdx = parseInt(q.value);
                        const isActive =
                          q.value === activeQuality ||
                          hlsRef.current?.currentLevel ===
                            levelIdx;
                        return (
                          <button
                            key={q.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveQuality(q.value);
                              if (hlsRef.current)
                                hlsRef.current.currentLevel =
                                  levelIdx;
                              setShowQualityMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors flex items-center justify-between ${
                              isActive
                                ? 'text-[#E50914] font-medium'
                                : 'text-white/80'
                            }`}
                          >
                            <span>{q.label}</span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeAllMenus();
                    setShowSettingsMenu(!showSettingsMenu);
                  }}
                  className="text-white/80 hover:text-white transition-colors p-1.5"
                  aria-label="Settings"
                >
                  <HiCog6Tooth className="w-4 h-4 md:w-5 md:h-5 hidden md:block" />
                </button>
                {showSettingsMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl py-2 min-w-[200px] shadow-2xl animate-scale-in origin-bottom-right z-30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAudioBoost(!isAudioBoost);
                        setShowSettingsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <HiBolt
                          className={`w-4 h-4 ${
                            isAudioBoost
                              ? 'text-[#E50914]'
                              : 'text-white/60'
                          }`}
                        />
                        <span
                          className={
                            isAudioBoost
                              ? 'text-white'
                              : 'text-white/80'
                          }
                        >
                          {t('player.audio_boost')}
                        </span>
                      </div>
                      <div
                        className={`w-8 h-[18px] rounded-full transition-colors relative ${
                          isAudioBoost
                            ? 'bg-[#E50914]'
                            : 'bg-white/20'
                        }`}
                      >
                        <div
                          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${
                            isAudioBoost
                              ? 'translate-x-[16px]'
                              : 'translate-x-[2px]'
                          }`}
                        />
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNightMode(!isNightMode);
                        setShowSettingsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <HiMoon
                          className={`w-4 h-4 ${
                            isNightMode
                              ? 'text-[#E50914]'
                              : 'text-white/60'
                          }`}
                        />
                        <span
                          className={
                            isNightMode
                              ? 'text-white'
                              : 'text-white/80'
                          }
                        >
                          {t('player.night_mode')}
                        </span>
                      </div>
                      <div
                        className={`w-8 h-[18px] rounded-full transition-colors relative ${
                          isNightMode
                            ? 'bg-[#E50914]'
                            : 'bg-white/20'
                        }`}
                      >
                        <div
                          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${
                            isNightMode
                              ? 'translate-x-[16px]'
                              : 'translate-x-[2px]'
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <div className="relative group/hint hidden md:block">
                <button
                  className="text-white/30 hover:text-white/60 transition-colors p-1.5 text-xs font-mono"
                  aria-label="Keyboard shortcuts"
                >
                  ?
                </button>
                <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl py-3 px-4 min-w-[220px] shadow-2xl opacity-0 invisible group-hover/hint:opacity-100 group-hover/hint:visible transition-all duration-200 origin-bottom-right scale-95 group-hover/hint:scale-100 z-30">
                  <p className="text-[10px] font-semibold text-[#808080] uppercase tracking-wider mb-2">
                    {t('player.shortcuts')}
                  </p>
                  <div className="space-y-1.5">
                    {(
                      [
                        ['Space / K', t('player.play_pause')],
                        ['F', t('player.fullscreen')],
                        [
                          '← →',
                          `${SEEK_STEP}s ${t('player.seek')}`,
                        ],
                        ['↑ ↓', `${t('player.volume')}`],
                        ['M', t('player.mute')],
                        [
                          '< >',
                          `${t('player.speed')}`,
                        ],
                        ['C', t('player.subtitles')],
                        ['P', 'PiP'],
                        ['0-9', t('player.seek_to')],
                      ] as const
                    ).map(([k, d]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className="text-[#808080]">
                          {d}
                        </span>
                        <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-white font-mono">
                          {k}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePiP();
                }}
                className={`transition-colors p-1.5 hidden md:block ${
                  isPiP
                    ? 'text-[#E50914]'
                    : 'text-white/80 hover:text-white'
                }`}
                aria-label="Picture in Picture"
              >
                <HiMiniWindow className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="text-white/80 hover:text-white transition-colors p-1.5"
                aria-label={
                  isFullscreen
                    ? 'Exit fullscreen'
                    : 'Fullscreen'
                }
              >
                {isFullscreen ? (
                  <HiArrowsPointingIn className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <HiArrowsPointingOut className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
