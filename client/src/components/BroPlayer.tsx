import { Cast, Download, Expand, Gauge, Maximize2, Minimize2, Pause, Play, RotateCcw, RotateCw, Settings2, Sun, Volume2, X } from "lucide-react";
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBrowserVideoSourceUrl } from "@/lib/mediaUpload";
import { getMediaKind, normalizeMediaUrl } from "@/lib/mediaKind";

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
const qualityChoices = ["Auto", "1080p", "720p", "480p", "360p"];

type GestureState = {
  startX: number;
  startY: number;
  lastY: number;
  side: "brightness" | "volume";
  moved: boolean;
};

type PlayerIndicator = {
  type: "volume" | "brightness" | "seek";
  value: string;
  preview?: string | null;
} | null;

type BroPlayerProps = {
  source: string;
  title: string;
  poster?: string | null;
  quality?: string;
  qualityVariants?: Record<string, string> | null;
  onActiveTime: (seconds: number) => void;
  onNextEpisode?: () => void;
  onDownload?: (currentSource?: string) => void;
};

type RemoteVideo = HTMLVideoElement & {
  remote?: { state: string; prompt: () => Promise<void> };
};

export function BroPlayer({ source, title, poster, quality = "1080p", qualityVariants, onActiveTime, onNextEpisode, onDownload }: BroPlayerProps) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<RemoteVideo>(null);
  const gesture = useRef<GestureState | null>(null);
  const lastTime = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const indicatorTimer = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [brightness, setBrightness] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [qualityChoice, setQualityChoice] = useState("Auto");
  const [indicator, setIndicator] = useState<PlayerIndicator>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [playPulse, setPlayPulse] = useState<"play" | "pause" | null>(null);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [playbackSource, setPlaybackSource] = useState(source);
  const isEmbed = getMediaKind(source) !== "direct";

  const variants = useMemo<Record<string, string>>(() => ({ Auto: source, ...(qualityVariants ?? {}) }), [qualityVariants, source]);
  const selectedSource = variants[qualityChoice] || source;
  const fallbackSource = getBrowserVideoSourceUrl(selectedSource);
  const isUsingFallback = playbackSource !== selectedSource;

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000);
  }, [playing]);

  const flash = useCallback((next: NonNullable<PlayerIndicator>) => {
    setIndicator(next);
    showControls();
    if (indicatorTimer.current !== null) window.clearTimeout(indicatorTimer.current);
    indicatorTimer.current = window.setTimeout(() => setIndicator(null), 850);
  }, [showControls]);

  const togglePlay = useCallback(() => {
    const player = video.current;
    if (!player) return;
    if (player.paused) {
      void player.play();
      setPlayPulse("play");
    } else {
      player.pause();
      setPlayPulse("pause");
    }
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPlayPulse(null), 500);
    showControls();
  }, [showControls]);

  const seek = useCallback((amount: number) => {
    const player = video.current;
    if (!player) return;
    player.currentTime = Math.max(0, Math.min(player.duration || 0, player.currentTime + amount));
    flash({ type: "seek", value: amount > 0 ? "+10s" : "−10s", preview: poster });
  }, [flash, poster]);

  const setPlayerVolume = useCallback((next: number, announce = true) => {
    const value = Math.round(Math.min(100, Math.max(0, next)));
    setVolume(value);
    if (video.current) video.current.volume = value / 100;
    if (announce) flash({ type: "volume", value: `${value}%` });
  }, [flash]);

  const startGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const side = event.clientX - bounds.left < bounds.width / 2 ? "brightness" : "volume";
    gesture.current = { startX: event.clientX, startY: event.clientY, lastY: event.clientY, side, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    showControls();
  };

  const moveGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontalDistance = event.clientX - current.startX;
    const verticalDistance = event.clientY - current.startY;
    if (Math.abs(horizontalDistance) > 52 && Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
      current.moved = true;
      seek(horizontalDistance > 0 ? 10 : -10);
      current.startX = event.clientX;
      current.startY = event.clientY;
      current.lastY = event.clientY;
      return;
    }
    if (Math.abs(verticalDistance) < 10) return;
    current.moved = true;
    const delta = ((current.lastY - event.clientY) / bounds.height) * 130;
    current.lastY = event.clientY;
    if (current.side === "brightness") {
      const next = Math.round(Math.max(0, Math.min(100, brightness + delta)));
      setBrightness(next);
      flash({ type: "brightness", value: `${next}%` });
    } else {
      setPlayerVolume(volume + delta);
    }
  };

  const endGesture = () => {
    gesture.current = null;
  };

  const requestFullscreen = async () => {
    const element = container.current;
    if (!element) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await element.requestFullscreen();
    } catch {
      // Fullscreen is not available in every embedded browser.
    }
  };

  const requestCast = async () => {
    const player = video.current;
    if (!player) return;
    try {
      if (player.remote?.state === "connected") {
        setIsCasting(false);
        return;
      }
      if (player.remote) {
        await player.remote.prompt();
        setIsCasting(true);
        return;
      }
      const presentation = (navigator as Navigator & { presentation?: { requestSession: (urls: string[]) => Promise<unknown> } }).presentation;
      if (presentation) {
        await presentation.requestSession([selectedSource]);
        setIsCasting(true);
      } else {
        flash({ type: "seek", value: "Cast unavailable" });
      }
    } catch {
      flash({ type: "seek", value: "Cast cancelled" });
    }
  };

  useEffect(() => {
    setPlaybackSource(selectedSource);
    setMediaError(false);
    setNextCountdown(null);
    setProgress(0);
    setDuration(0);
    lastTime.current = null;
  }, [selectedSource]);

  useEffect(() => {
    if (video.current) video.current.playbackRate = speed;
  }, [speed, playbackSource]);

  useEffect(() => {
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  useEffect(() => {
    if (playing) showControls();
    else {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      setControlsVisible(true);
    }
    return () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, [playing, showControls]);

  useEffect(() => () => {
    if (indicatorTimer.current !== null) window.clearTimeout(indicatorTimer.current);
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
  }, []);

  useEffect(() => {
    if (nextCountdown === null || !onNextEpisode) return;
    if (nextCountdown <= 0) {
      onNextEpisode();
      return;
    }
    const timer = window.setTimeout(() => setNextCountdown(value => value === null ? null : value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [nextCountdown, onNextEpisode]);

  const onTimeUpdate = () => {
    const player = video.current;
    if (!player) return;
    setProgress(player.currentTime);
    if (player.paused || document.visibilityState !== "visible") {
      lastTime.current = player.currentTime;
      return;
    }
    if (lastTime.current !== null) onActiveTime(Math.max(0, Math.min(3, player.currentTime - lastTime.current)));
    lastTime.current = player.currentTime;
  };

  if (isEmbed) {
    const embedUrl = normalizeMediaUrl(source);
    return <div ref={container} className="relative aspect-video overflow-hidden rounded-[1.5rem] border border-white/[.1] bg-black shadow-[0_25px_80px_rgba(0,0,0,.55)]">
      <iframe title={title} src={embedUrl} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen className="h-full w-full border-0 bg-black" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 sm:p-5">
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ff5660]">In-site embed</p><h2 className="truncate text-sm font-bold text-white sm:text-base">{title}</h2></div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.1em] text-zinc-300">{getMediaKind(source) === "telegram" ? "Telegram" : "External"}</span>
      </div>
      {onDownload && <button aria-label="Download current video" onClick={() => onDownload(source)} className="absolute bottom-4 right-4 rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-xs font-bold text-white backdrop-blur hover:bg-black">Download</button>}
    </div>;
  }

  const handleMediaError = () => {
    if (!isUsingFallback && fallbackSource && fallbackSource !== selectedSource) {
      setPlaybackSource(fallbackSource);
      setMediaError(false);
      return;
    }
    setMediaError(true);
  };

  return <div
    ref={container}
    className="bro-player group relative aspect-video overflow-hidden rounded-[1.5rem] border border-white/[.1] bg-black shadow-[0_25px_80px_rgba(0,0,0,.55)] select-none"
    onPointerMove={showControls}
    onMouseLeave={() => { if (playing) setControlsVisible(false); }}
  >
    <video
      key={playbackSource}
      ref={video}
      src={playbackSource}
      poster={poster ?? undefined}
      playsInline
      preload="metadata"
      crossOrigin="anonymous"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={event => { setDuration(event.currentTarget.duration || 0); event.currentTarget.volume = volume / 100; event.currentTarget.playbackRate = speed; setMediaError(false); }}
      onError={handleMediaError}
      onEnded={() => { setPlaying(false); if (onNextEpisode) setNextCountdown(10); }}
      style={{ filter: `brightness(${Math.max(15, brightness)}%)` }}
      className="h-full w-full object-contain"
    />

    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-black/55" />
    <div
      className="absolute inset-0 z-10 touch-none"
      onPointerDown={startGesture}
      onPointerMove={moveGesture}
      onPointerUp={() => { const current = gesture.current; endGesture(); if (current && !current.moved) togglePlay(); }}
      onPointerCancel={endGesture}
    />

    <div className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-4 transition-opacity duration-200 sm:p-5 ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
      <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ff5660]">Bro Player</p><h2 className="mt-1 truncate text-sm font-bold text-white sm:text-base">{title}</h2></div>
      <span className="shrink-0 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.1em] text-zinc-300 backdrop-blur">{quality}</span>
    </div>

    <button aria-label={playing ? "Pause video" : "Play video"} onClick={togglePlay} className={`absolute left-1/2 top-1/2 z-20 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#E50914] text-white shadow-[0_0_40px_rgba(229,9,20,.45)] transition-all duration-200 ${controlsVisible ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>{playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}</button>

    {indicator && <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/15 bg-zinc-950/80 px-5 py-4 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex min-w-24 flex-col items-center gap-2">
        {indicator.type === "brightness" ? <Sun className="h-7 w-7 text-amber-200" /> : indicator.type === "volume" ? <Volume2 className="h-7 w-7 text-sky-200" /> : indicator.preview ? <img src={indicator.preview} alt="Seek preview" className="h-12 w-20 rounded-lg object-cover" /> : indicator.value.startsWith("+") ? <RotateCw className="h-7 w-7" /> : <RotateCcw className="h-7 w-7" />}
        <span className="text-sm font-black">{indicator.value}</span>
      </div>
    </div>}

    {playPulse && <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-[bro-pulse_.5s_ease-out] place-items-center rounded-full bg-black/55 text-white backdrop-blur-md">{playPulse === "play" ? <Play className="ml-1 h-9 w-9 fill-current" /> : <Pause className="h-9 w-9 fill-current" />}</div>}

    {mediaError && <div className="absolute inset-0 z-30 grid place-items-center bg-black/75 p-6 text-center backdrop-blur-sm"><div><X className="mx-auto h-10 w-10 text-red-300" /><p className="mt-3 text-sm font-bold text-white">This link could not be played in the browser.</p><p className="mt-1 max-w-md text-xs leading-5 text-zinc-400">The original HTTPS link was preserved. The source may require a direct video response, byte ranges, or provider access.</p></div></div>}

    {nextCountdown !== null && onNextEpisode && <div className="absolute bottom-24 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-950/90 p-4 shadow-2xl backdrop-blur-xl"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ff5660]">Up next</p><p className="mt-1 text-sm font-bold text-white">Next episode starts in {nextCountdown}s</p><div className="mt-3 flex gap-2"><button onClick={onNextEpisode} className="primary-action flex-1 py-2 text-xs">Play next</button><button onClick={() => setNextCountdown(null)} className="secondary-action px-3 py-2 text-xs">Cancel</button></div></div>}

    <div className={`absolute bottom-0 left-0 right-0 z-20 p-4 transition-opacity duration-200 sm:p-5 ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="mb-3 flex items-center gap-3"><span className="w-10 text-right text-[11px] font-bold tabular-nums text-zinc-300">{formatTime(progress)}</span><input aria-label="Seek video" type="range" min="0" max={duration || 0} step="0.1" value={progress} onChange={event => { if (video.current) { const value = Number(event.target.value); video.current.currentTime = value; setProgress(value); } }} className="bro-player-range min-w-0 flex-1" style={{ "--progress": `${duration ? (progress / duration) * 100 : 0}%` } as React.CSSProperties} /><span className="w-10 text-[11px] font-bold tabular-nums text-zinc-400">{formatTime(duration)}</span></div>
      <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1"><button aria-label="Seek backward 10 seconds" onClick={() => seek(-10)} className="bro-control"><RotateCcw className="h-4 w-4" /></button><button aria-label={playing ? "Pause" : "Play"} onClick={togglePlay} className="bro-control">{playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</button><button aria-label="Seek forward 10 seconds" onClick={() => seek(10)} className="bro-control"><RotateCw className="h-4 w-4" /></button><span className="ml-2 hidden text-xs font-medium text-zinc-400 sm:inline">{isUsingFallback ? "Provider proxy" : "Direct source"}</span></div><div className="flex items-center gap-1"><button aria-label="Chromecast" onClick={() => void requestCast()} className={`bro-control ${isCasting ? "bg-white/15 text-white" : ""}`}><Cast className="h-4 w-4" /></button><button aria-label="Download current video" onClick={() => onDownload?.(playbackSource)} className="bro-control"><Download className="h-4 w-4" /></button><div className="relative"><button aria-label="Player settings" onClick={() => setShowSettings(value => !value)} className="bro-control"><Settings2 className="h-4 w-4" /></button>{showSettings && <div className="absolute bottom-10 right-0 w-56 rounded-2xl border border-white/10 bg-zinc-950/95 p-3 text-sm shadow-2xl backdrop-blur-xl"><label className="block text-[10px] font-black uppercase tracking-[.15em] text-zinc-500">Quality<select value={qualityChoice} onChange={event => { setQualityChoice(event.target.value); setShowSettings(false); }} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-[#E50914]">{qualityChoices.map(choice => <option key={choice} value={choice}>{choice}{choice !== "Auto" && !variants[choice] ? " · same source" : ""}</option>)}</select></label><label className="mt-3 block text-[10px] font-black uppercase tracking-[.15em] text-zinc-500">Speed<select value={speed} onChange={event => setSpeed(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-[#E50914]">{speeds.map(value => <option key={value} value={value}>{value}x</option>)}</select></label><button onClick={() => { onDownload?.(playbackSource); setShowSettings(false); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[.05] px-3 py-2 text-xs font-bold text-white"><Download className="h-3.5 w-3.5" />Download video</button><p className="mt-3 text-[10px] leading-4 text-zinc-500">Swipe up/down on the left for brightness and on the right for volume. Swipe horizontally to seek 10 seconds.</p></div>}</div><button aria-label="Fullscreen" onClick={() => void requestFullscreen()} className="bro-control">{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button></div></div>
    </div>
  </div>;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  return `${mins}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};
