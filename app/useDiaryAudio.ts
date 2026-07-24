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
    lfoRate: number;
    motif: number[];
    motifInterval: number;
  }
> = {
  cover: {
    droneA: 49,
    droneB: 73.42,
    droneLevel: 0.014,
    harmonyLevel: 0.008,
    rainLevel: 0.038,
    rainFrequency: 840,
    lfoRate: 0.075,
    motif: [],
    motifInterval: 9000,
  },
  quiet: {
    droneA: 55,
    droneB: 82.41,
    droneLevel: 0.018,
    harmonyLevel: 0.011,
    rainLevel: 0.028,
    rainFrequency: 1050,
    lfoRate: 0.085,
    motif: [110, 164.81, 123.47, 130.81],
    motifInterval: 8800,
  },
  uneasy: {
    droneA: 51.91,
    droneB: 73.42,
    droneLevel: 0.024,
    harmonyLevel: 0.014,
    rainLevel: 0.032,
    rainFrequency: 820,
    lfoRate: 0.12,
    motif: [103.83, 146.83, 116.54, 138.59],
    motifInterval: 7200,
  },
  dread: {
    droneA: 43.65,
    droneB: 61.74,
    droneLevel: 0.032,
    harmonyLevel: 0.019,
    rainLevel: 0.037,
    rainFrequency: 620,
    lfoRate: 0.18,
    motif: [87.31, 123.47, 92.5, 116.54],
    motifInterval: 5900,
  },
  ending: {
    droneA: 55,
    droneB: 73.42,
    droneLevel: 0.015,
    harmonyLevel: 0.009,
    rainLevel: 0.012,
    rainFrequency: 1320,
    lfoRate: 0.06,
    motif: [110, 164.81, 130.81, 220],
    motifInterval: 9800,
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
  droneFilter.frequency.value = 540;
  droneFilter.Q.value = 0.7;
  droneFilter.connect(music);

  const droneA = context.createOscillator();
  const droneB = context.createOscillator();
  const droneAGain = context.createGain();
  const droneBGain = context.createGain();
  droneA.type = "sine";
  droneB.type = "triangle";
  droneA.frequency.value = moodSettings.cover.droneA;
  droneB.frequency.value = moodSettings.cover.droneB;
  droneB.detune.value = -7;
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

function playMotif(graph: AudioGraph, mood: DiaryAudioMood) {
  const notes = moodSettings[mood].motif;
  if (notes.length === 0) return;

  const now = graph.context.currentTime + 0.08;
  notes.forEach((frequency, index) => {
    const start = now + index * (mood === "dread" ? 0.66 : 0.82);
    const duration = mood === "ending" ? 2.4 : 1.8;
    playTone(
      graph,
      frequency,
      start,
      duration,
      mood === "dread" ? 0.017 : 0.014,
      graph.music,
      index % 2 === 0 ? "sine" : "triangle",
      frequency * (mood === "dread" && index === notes.length - 1 ? 0.985 : 1),
    );
    playTone(
      graph,
      frequency * 2,
      start + 0.012,
      duration * 0.72,
      0.0045,
      graph.music,
      "sine",
    );
  });
}

function playCue(graph: AudioGraph, cue: DiarySoundCue) {
  const now = graph.context.currentTime + 0.012;

  switch (cue) {
    case "open":
      playNoise(graph, now, 0.42, 0.12, "bandpass", 780, 0.72);
      playTone(graph, 92, now, 0.36, 0.08, graph.sfx, "sine", 69);
      break;
    case "close":
      playNoise(graph, now, 0.18, 0.09, "lowpass", 520, 0.76);
      playTone(graph, 73, now + 0.03, 0.32, 0.075, graph.sfx, "sine", 55);
      break;
    case "page":
      playNoise(graph, now, 0.22, 0.11, "bandpass", 1450, 1.12);
      playNoise(graph, now + 0.055, 0.25, 0.075, "bandpass", 820, 0.88);
      break;
    case "collect":
      playNoise(graph, now, 0.16, 0.085, "highpass", 1650, 1.32);
      playTone(graph, 620, now + 0.03, 0.12, 0.035, graph.sfx, "triangle", 510);
      break;
    case "erase":
      playNoise(graph, now, 0.28, 0.075, "highpass", 940, 0.72);
      playTone(graph, 330, now + 0.02, 0.13, 0.025, graph.sfx, "sine", 245);
      break;
    case "pin":
      playTone(graph, 760, now, 0.1, 0.045, graph.sfx, "triangle", 620);
      playTone(graph, 1040, now + 0.055, 0.08, 0.022, graph.sfx, "sine", 820);
      break;
    case "unpin":
      playTone(graph, 570, now, 0.12, 0.035, graph.sfx, "triangle", 430);
      break;
    case "correct":
      playTone(graph, 146.83, now, 0.62, 0.055, graph.sfx, "sine");
      playTone(graph, 174.61, now + 0.14, 0.72, 0.047, graph.sfx, "sine");
      playTone(graph, 220, now + 0.3, 0.92, 0.04, graph.sfx, "triangle");
      break;
    case "wrong":
      playTone(graph, 82.41, now, 0.38, 0.085, graph.sfx, "sine", 55);
      playNoise(graph, now, 0.16, 0.055, "lowpass", 280, 0.58);
      break;
    case "trace":
      playNoise(graph, now, 0.46, 0.07, "bandpass", 1180, 0.65);
      playTone(graph, 392, now + 0.08, 0.55, 0.032, graph.sfx, "sine", 523.25);
      break;
    case "hint":
      playTone(graph, 659.25, now, 0.28, 0.033, graph.sfx, "sine");
      playTone(graph, 783.99, now + 0.12, 0.36, 0.026, graph.sfx, "sine");
      break;
    case "crossout":
      playNoise(graph, now, 0.42, 0.085, "highpass", 1250, 0.72);
      playTone(graph, 196, now + 0.04, 0.22, 0.024, graph.sfx, "triangle", 164.81);
      break;
    case "write":
      playNoise(graph, now, 0.32, 0.078, "highpass", 1580, 0.78);
      playTone(graph, 392, now + 0.18, 0.42, 0.027, graph.sfx, "sine", 440);
      break;
    case "reveal":
      playTone(graph, 110, now, 1.2, 0.055, graph.sfx, "sine");
      playTone(graph, 146.83, now + 0.12, 1.3, 0.042, graph.sfx, "sine");
      playTone(graph, 220, now + 0.28, 1.45, 0.032, graph.sfx, "triangle");
      break;
    case "select":
      playTone(graph, 440, now, 0.13, 0.03, graph.sfx, "triangle", 392);
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
  const motifTimeoutRef = useRef<number | null>(null);
  const motifIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const clearMotifLoop = useCallback(() => {
    if (motifTimeoutRef.current !== null) {
      window.clearTimeout(motifTimeoutRef.current);
      motifTimeoutRef.current = null;
    }
    if (motifIntervalRef.current !== null) {
      window.clearInterval(motifIntervalRef.current);
      motifIntervalRef.current = null;
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
      clearMotifLoop();
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
  }, [clearMotifLoop, ready, unlock]);

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
    clearMotifLoop();
    const graph = graphRef.current;
    const settings = moodSettings[mood];
    if (!ready || !enabled || !graph || settings.motif.length === 0) return;

    motifTimeoutRef.current = window.setTimeout(() => {
      if (graph.context.state === "running" && enabledRef.current) {
        playMotif(graph, moodRef.current);
      }
    }, 1300);
    motifIntervalRef.current = window.setInterval(() => {
      if (graph.context.state === "running" && enabledRef.current) {
        playMotif(graph, moodRef.current);
      }
    }, settings.motifInterval);

    return clearMotifLoop;
  }, [clearMotifLoop, enabled, mood, ready]);

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
      clearMotifLoop();
      const graph = graphRef.current;
      if (!graph) return;
      graph.droneA.stop();
      graph.droneB.stop();
      graph.rain.stop();
      graph.lfo.stop();
      void graph.context.close();
      graphRef.current = null;
    },
    [clearMotifLoop],
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
