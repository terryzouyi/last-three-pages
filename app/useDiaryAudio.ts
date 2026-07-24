"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DiaryAudioMood =
  | "cover"
  | "quiet"
  | "uneasy"
  | "dread"
  | "ending";

export type DiarySoundCue =
  | "open"
  | "close"
  | "page"
  | "collect"
  | "erase"
  | "pin"
  | "unpin"
  | "correct"
  | "wrong"
  | "trace"
  | "hint"
  | "crossout"
  | "write"
  | "reveal"
  | "select";

type AudioPreference = {
  enabled: boolean;
  volume: number;
};

type AudioGraph = {
  context: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  droneA: OscillatorNode;
  droneB: OscillatorNode;
  droneAGain: GainNode;
  droneBGain: GainNode;
  droneFilter: BiquadFilterNode;
  rain: AudioBufferSourceNode;
  rainFilter: BiquadFilterNode;
  rainGain: GainNode;
  lfo: OscillatorNode;
  lfoDepth: GainNode;
  noiseBuffer: AudioBuffer;
};

const AUDIO_STORAGE_KEY = "last-three-pages-audio-v1";

const moodSettings: Record<
  DiaryAudioMood,
  {
    droneA: number;
    droneB: number;
    droneLevel: number;
    harmonyLevel: number;
    rainLevel: number;
    rainFrequency: number;
    droneFilter: number;
    lfoRate: number;
    textureDelay: [number, number];
  }
> = {
  cover: {
    droneA: 46.25,
    droneB: 46.58,
    droneLevel: 0.012,
    harmonyLevel: 0.009,
    rainLevel: 0.052,
    rainFrequency: 980,
    droneFilter: 220,
    lfoRate: 0.045,
    textureDelay: [15000, 24000],
  },
  quiet: {
    droneA: 49,
    droneB: 49.36,
    droneLevel: 0.013,
    harmonyLevel: 0.01,
    rainLevel: 0.037,
    rainFrequency: 1120,
    droneFilter: 230,
    lfoRate: 0.052,
    textureDelay: [14000, 23000],
  },
  uneasy: {
    droneA: 46.25,
    droneB: 48.74,
    droneLevel: 0.019,
    harmonyLevel: 0.014,
    rainLevel: 0.028,
    rainFrequency: 760,
    droneFilter: 195,
    lfoRate: 0.085,
    textureDelay: [9000, 16000],
  },
  dread: {
    droneA: 41.2,
    droneB: 43.38,
    droneLevel: 0.026,
    harmonyLevel: 0.019,
    rainLevel: 0.018,
    rainFrequency: 540,
    droneFilter: 165,
    lfoRate: 0.14,
    textureDelay: [6500, 10500],
  },
  ending: {
    droneA: 48.75,
    droneB: 49,
    droneLevel: 0.008,
    harmonyLevel: 0.006,
    rainLevel: 0.007,
    rainFrequency: 1380,
    droneFilter: 185,
    lfoRate: 0.035,
    textureDelay: [19000, 29000],
  },
};

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, value));
}

function createNoiseBuffer(context: AudioContext) {
  const length = Math.floor(context.sampleRate * 2.5);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;

  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.965 + white * 0.035;
    data[index] = previous * 2.1;
  }

  return buffer;
}

function buildAudioGraph(context: AudioContext): AudioGraph {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 16;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.22;
  compressor.connect(context.destination);

  const master = context.createGain();
  const music = context.createGain();
  const sfx = context.createGain();
  master.gain.value = 0.0001;
  music.gain.value = 1;
  sfx.gain.value = 1;
  music.connect(master);
  sfx.connect(master);
  master.connect(compressor);

  const droneFilter = context.createBiquadFilter();
  droneFilter.type = "lowpass";
  droneFilter.frequency.value = moodSettings.cover.droneFilter;
  droneFilter.Q.value = 0.42;
  droneFilter.connect(music);

  const droneA = context.createOscillator();
  const droneB = context.createOscillator();
  const droneAGain = context.createGain();
  const droneBGain = context.createGain();
  droneA.type = "sine";
  droneB.type = "sine";
  droneA.frequency.value = moodSettings.cover.droneA;
  droneB.frequency.value = moodSettings.cover.droneB;
  droneAGain.gain.value = moodSettings.cover.droneLevel;
  droneBGain.gain.value = moodSettings.cover.harmonyLevel;
  droneA.connect(droneAGain).connect(droneFilter);
  droneB.connect(droneBGain).connect(droneFilter);

  const lfo = context.createOscillator();
  const lfoDepth = context.createGain();
  lfo.type = "sine";
  lfo.frequency.value = moodSettings.cover.lfoRate;
  lfoDepth.gain.value = 0.004;
  lfo.connect(lfoDepth).connect(droneAGain.gain);

  const noiseBuffer = createNoiseBuffer(context);
  const rain = context.createBufferSource();
  const rainFilter = context.createBiquadFilter();
  const rainGain = context.createGain();
  rain.buffer = noiseBuffer;
  rain.loop = true;
  rain.playbackRate.value = 0.82;
  rainFilter.type = "bandpass";
  rainFilter.frequency.value = moodSettings.cover.rainFrequency;
  rainFilter.Q.value = 0.62;
  rainGain.gain.value = moodSettings.cover.rainLevel;
  rain.connect(rainFilter).connect(rainGain).connect(music);

  droneA.start();
  droneB.start();
  lfo.start();
  rain.start();

  return {
    context,
    master,
    music,
    sfx,
    droneA,
    droneB,
    droneAGain,
    droneBGain,
    droneFilter,
    rain,
    rainFilter,
    rainGain,
    lfo,
    lfoDepth,
    noiseBuffer,
  };
}

function applyMood(graph: AudioGraph, mood: DiaryAudioMood) {
  const settings = moodSettings[mood];
  const now = graph.context.currentTime;
  graph.droneA.frequency.setTargetAtTime(settings.droneA, now, 1.2);
  graph.droneB.frequency.setTargetAtTime(settings.droneB, now, 1.35);
  graph.droneAGain.gain.setTargetAtTime(settings.droneLevel, now, 0.9);
  graph.droneBGain.gain.setTargetAtTime(settings.harmonyLevel, now, 0.9);
  graph.droneFilter.frequency.setTargetAtTime(
    settings.droneFilter,
    now,
    1.15,
  );
  graph.rainGain.gain.setTargetAtTime(settings.rainLevel, now, 1.1);
  graph.rainFilter.frequency.setTargetAtTime(
    settings.rainFrequency,
    now,
    1.2,
  );
  graph.lfo.frequency.setTargetAtTime(settings.lfoRate, now, 1.1);
}

function playTone(
  graph: AudioGraph,
  frequency: number,
  start: number,
  duration: number,
  level: number,
  destination: AudioNode = graph.sfx,
  type: OscillatorType = "sine",
  endFrequency?: number,
) {
  const oscillator = graph.context.createOscillator();
  const filter = graph.context.createBiquadFilter();
  const gain = graph.context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      start + duration,
    );
  }
  filter.type = "lowpass";
  filter.frequency.value = Math.max(520, frequency * 5);
  filter.Q.value = 0.55;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(filter).connect(gain).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function playNoise(
  graph: AudioGraph,
  start: number,
  duration: number,
  level: number,
  filterType: BiquadFilterType,
  frequency: number,
  playbackRate = 1,
) {
  const source = graph.context.createBufferSource();
  const filter = graph.context.createBiquadFilter();
  const gain = graph.context.createGain();
  source.buffer = graph.noiseBuffer;
  source.playbackRate.value = playbackRate;
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = 0.8;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(graph.sfx);
  const availableOffset = Math.max(0, graph.noiseBuffer.duration - duration);
  source.start(start, Math.random() * availableOffset, duration);
}

function playNoiseSwell(
  graph: AudioGraph,
  start: number,
  duration: number,
  level: number,
  frequency: number,
) {
  const source = graph.context.createBufferSource();
  const filter = graph.context.createBiquadFilter();
  const gain = graph.context.createGain();
  source.buffer = graph.noiseBuffer;
  source.playbackRate.value = 0.46;
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + duration * 0.76);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(graph.sfx);
  source.start(start, 0, Math.min(duration, graph.noiseBuffer.duration));
}

function playKnock(
  graph: AudioGraph,
  start: number,
  level = 0.055,
  frequency = 72,
) {
  playNoise(graph, start, 0.075, level * 0.72, "lowpass", 330, 0.62);
  playTone(
    graph,
    frequency,
    start,
    0.22,
    level,
    graph.sfx,
    "sine",
    frequency * 0.72,
  );
}

function duckRoom(graph: AudioGraph, start: number, hold: number) {
  graph.music.gain.cancelScheduledValues(start);
  graph.music.gain.setValueAtTime(graph.music.gain.value, start);
  graph.music.gain.linearRampToValueAtTime(0.08, start + 0.12);
  graph.music.gain.setValueAtTime(0.08, start + hold);
  graph.music.gain.linearRampToValueAtTime(1, start + hold + 1.7);
}

function playAmbientTexture(graph: AudioGraph, mood: DiaryAudioMood) {
  const now = graph.context.currentTime + 0.04;
  const variant = Math.random();

  if (mood === "cover") {
    playNoiseSwell(graph, now, 1.8, 0.012, 420);
    if (variant > 0.64) {
      playTone(graph, 63, now + 0.48, 1.25, 0.012, graph.music, "sine", 51);
    }
    return;
  }

  if (mood === "quiet") {
    if (variant < 0.58) {
      playNoiseSwell(graph, now, 1.15, 0.014, 520);
      playTone(graph, 69, now + 0.22, 0.82, 0.012, graph.music, "sine", 57);
    } else {
      playNoise(graph, now, 0.035, 0.017, "highpass", 2100, 1.22);
      playNoise(graph, now + 0.94, 0.03, 0.012, "highpass", 1900, 1.08);
    }
    return;
  }

  if (mood === "uneasy") {
    if (variant < 0.52) {
      playKnock(graph, now, 0.019, 76);
      if (variant < 0.21) playKnock(graph, now + 0.82, 0.014, 71);
    } else {
      playNoiseSwell(graph, now, 1.45, 0.018, 710);
      playNoise(graph, now + 1.1, 0.16, 0.014, "highpass", 1500, 0.7);
    }
    return;
  }

  if (mood === "dread") {
    if (variant < 0.62) {
      playTone(graph, 46, now, 0.24, 0.034, graph.music, "sine", 39);
      playTone(
        graph,
        43,
        now + 0.43,
        0.2,
        0.024,
        graph.music,
        "sine",
        37,
      );
      playNoise(graph, now, 0.09, 0.017, "lowpass", 220, 0.5);
      playNoise(graph, now + 0.43, 0.075, 0.012, "lowpass", 210, 0.48);
    } else {
      playNoise(graph, now, 0.028, 0.024, "highpass", 2500, 1.32);
      playNoise(graph, now + 0.78, 0.026, 0.019, "highpass", 2360, 1.2);
      playTone(graph, 2470, now + 0.06, 1.65, 0.0018, graph.music, "sine");
    }
    return;
  }

  if (variant > 0.7) {
    playNoiseSwell(graph, now, 1.65, 0.008, 860);
  }
}

function playCue(graph: AudioGraph, cue: DiarySoundCue) {
  const now = graph.context.currentTime + 0.012;

  switch (cue) {
    case "open":
      playNoise(graph, now, 0.48, 0.11, "bandpass", 720, 0.66);
      playTone(graph, 71, now + 0.04, 0.42, 0.052, graph.sfx, "sine", 49);
      break;
    case "close":
      playNoise(graph, now, 0.2, 0.082, "lowpass", 470, 0.72);
      playTone(graph, 64, now + 0.03, 0.34, 0.055, graph.sfx, "sine", 43);
      break;
    case "page":
      playNoise(graph, now, 0.24, 0.1, "bandpass", 1380, 1.04);
      playNoise(graph, now + 0.06, 0.28, 0.064, "bandpass", 760, 0.82);
      break;
    case "collect":
      playNoise(graph, now, 0.21, 0.073, "highpass", 1480, 0.88);
      playNoise(graph, now + 0.16, 0.045, 0.026, "lowpass", 380, 0.62);
      break;
    case "erase":
      playNoise(graph, now, 0.34, 0.07, "highpass", 860, 0.64);
      playNoise(graph, now + 0.08, 0.18, 0.026, "bandpass", 540, 0.52);
      break;
    case "pin":
      playNoise(graph, now, 0.045, 0.048, "highpass", 1900, 1.18);
      playTone(graph, 118, now, 0.16, 0.026, graph.sfx, "sine", 86);
      break;
    case "unpin":
      playNoise(graph, now, 0.065, 0.038, "bandpass", 880, 0.84);
      playTone(graph, 102, now, 0.14, 0.02, graph.sfx, "sine", 74);
      break;
    case "correct":
      duckRoom(graph, now, 0.5);
      playNoiseSwell(graph, now + 0.05, 0.9, 0.026, 390);
      playKnock(graph, now + 0.52, 0.045, 64);
      break;
    case "wrong":
      playNoise(graph, now, 0.12, 0.058, "bandpass", 620, 0.58);
      playTone(graph, 61, now + 0.02, 0.3, 0.052, graph.sfx, "sine", 42);
      break;
    case "trace":
      playNoiseSwell(graph, now, 0.72, 0.048, 910);
      playNoise(graph, now + 0.48, 0.28, 0.036, "highpass", 1320, 0.62);
      playKnock(graph, now + 0.86, 0.019, 69);
      break;
    case "hint":
      playNoise(graph, now, 0.04, 0.035, "highpass", 1780, 1.06);
      playNoise(graph, now + 0.16, 0.035, 0.026, "highpass", 1650, 0.94);
      playTone(graph, 132, now + 0.02, 0.16, 0.018, graph.sfx, "sine", 105);
      break;
    case "crossout":
      playNoise(graph, now, 0.48, 0.078, "highpass", 1180, 0.64);
      playNoise(graph, now + 0.18, 0.22, 0.031, "bandpass", 560, 0.56);
      break;
    case "write":
      duckRoom(graph, now, 1.7);
      playNoise(graph, now, 0.38, 0.073, "highpass", 1440, 0.7);
      playNoise(graph, now + 0.34, 0.29, 0.052, "highpass", 1310, 0.66);
      playKnock(graph, now + 0.98, 0.034, 67);
      playKnock(graph, now + 1.36, 0.029, 64);
      playKnock(graph, now + 1.76, 0.024, 61);
      break;
    case "reveal":
      duckRoom(graph, now, 1.15);
      playNoiseSwell(graph, now, 1.42, 0.044, 470);
      playTone(graph, 54, now + 0.88, 0.82, 0.06, graph.sfx, "sine", 36);
      playKnock(graph, now + 1.28, 0.036, 62);
      break;
    case "select":
      playNoise(graph, now, 0.052, 0.032, "highpass", 1420, 0.92);
      playTone(graph, 104, now, 0.13, 0.017, graph.sfx, "sine", 82);
      break;
  }
}

export function useDiaryAudio(mood: DiaryAudioMood) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolumeState] = useState(0.58);
  const [ready, setReady] = useState(false);
  const [preferenceHydrated, setPreferenceHydrated] = useState(false);
  const graphRef = useRef<AudioGraph | null>(null);
  const moodRef = useRef(mood);
  const enabledRef = useRef(enabled);
  const volumeRef = useRef(volume);
  const textureTimerRef = useRef<number | null>(null);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const clearTextureLoop = useCallback(() => {
    if (textureTimerRef.current !== null) {
      window.clearTimeout(textureTimerRef.current);
      textureTimerRef.current = null;
    }
  }, []);

  const getGraph = useCallback(() => {
    if (graphRef.current) return graphRef.current;
    const context = new AudioContext();
    const graph = buildAudioGraph(context);
    graphRef.current = graph;
    applyMood(graph, moodRef.current);
    return graph;
  }, []);

  const unlock = useCallback(() => {
    if (!enabledRef.current) return;
    const graph = getGraph();
    void graph.context.resume().then(() => {
      const now = graph.context.currentTime;
      graph.master.gain.cancelScheduledValues(now);
      graph.master.gain.setTargetAtTime(volumeRef.current, now, 0.09);
      setReady(true);
    });
  }, [getGraph]);

  const play = useCallback(
    (cue: DiarySoundCue) => {
      if (!enabledRef.current) return;
      const graph = getGraph();
      void graph.context.resume().then(() => {
        const now = graph.context.currentTime;
        graph.master.gain.cancelScheduledValues(now);
        graph.master.gain.setTargetAtTime(volumeRef.current, now, 0.07);
        setReady(true);
        playCue(graph, cue);
      });
    },
    [getGraph],
  );

  const toggle = useCallback(() => {
    const graph = graphRef.current;

    if (enabledRef.current && !ready) {
      unlock();
      return;
    }

    if (enabledRef.current) {
      setEnabled(false);
      clearTextureLoop();
      if (graph) {
        const now = graph.context.currentTime;
        graph.master.gain.cancelScheduledValues(now);
        graph.master.gain.setTargetAtTime(0.0001, now, 0.06);
      }
      return;
    }

    setEnabled(true);
    enabledRef.current = true;
    unlock();
  }, [clearTextureLoop, ready, unlock]);

  const setVolume = useCallback(
    (nextVolume: number) => {
      const normalized = clampVolume(nextVolume);
      setVolumeState(normalized);
      volumeRef.current = normalized;
      const graph = graphRef.current;
      if (!graph || !enabledRef.current) return;
      const now = graph.context.currentTime;
      graph.master.gain.cancelScheduledValues(now);
      graph.master.gain.setTargetAtTime(normalized, now, 0.05);
    },
    [],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration of a device-local audio preference */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AudioPreference>;
        if (typeof saved.enabled === "boolean") {
          setEnabled(saved.enabled);
        }
        if (typeof saved.volume === "number") {
          setVolumeState(clampVolume(saved.volume));
        }
      }
    } catch {
      window.localStorage.removeItem(AUDIO_STORAGE_KEY);
    } finally {
      setPreferenceHydrated(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!preferenceHydrated) return;
    window.localStorage.setItem(
      AUDIO_STORAGE_KEY,
      JSON.stringify({ enabled, volume } satisfies AudioPreference),
    );
  }, [enabled, preferenceHydrated, volume]);

  useEffect(() => {
    const graph = graphRef.current;
    if (graph) applyMood(graph, mood);
  }, [mood]);

  useEffect(() => {
    clearTextureLoop();
    const graph = graphRef.current;
    if (!ready || !enabled || !graph) return;

    const scheduleNextTexture = () => {
      const [minimum, maximum] =
        moodSettings[moodRef.current].textureDelay;
      const delay = minimum + Math.random() * (maximum - minimum);
      textureTimerRef.current = window.setTimeout(() => {
        if (!enabledRef.current) return;
        if (graph.context.state === "running") {
          playAmbientTexture(graph, moodRef.current);
        }
        scheduleNextTexture();
      }, delay);
    };

    scheduleNextTexture();
    return clearTextureLoop;
  }, [clearTextureLoop, enabled, mood, ready]);

  useEffect(() => {
    if (!enabled) return;

    const unlockOnFirstGesture = () => unlock();
    window.addEventListener("pointerdown", unlockOnFirstGesture, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", unlockOnFirstGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockOnFirstGesture);
      window.removeEventListener("keydown", unlockOnFirstGesture);
    };
  }, [enabled, unlock]);

  useEffect(
    () => () => {
      clearTextureLoop();
      const graph = graphRef.current;
      if (!graph) return;
      graph.droneA.stop();
      graph.droneB.stop();
      graph.rain.stop();
      graph.lfo.stop();
      void graph.context.close();
      graphRef.current = null;
    },
    [clearTextureLoop],
  );

  return useMemo(
    () => ({
      enabled,
      ready,
      volume,
      play,
      toggle,
      setVolume,
      unlock,
    }),
    [enabled, play, ready, setVolume, toggle, unlock, volume],
  );
}
