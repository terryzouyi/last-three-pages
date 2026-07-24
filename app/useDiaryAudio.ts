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
  ambience: GainNode;
  sfx: GainNode;
  noiseBuffer: AudioBuffer;
};

const AUDIO_STORAGE_KEY = "last-three-pages-audio-v1";

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
  const ambience = context.createGain();
  const sfx = context.createGain();
  master.gain.value = 0.0001;
  ambience.gain.value = 0.72;
  sfx.gain.value = 1;
  ambience.connect(master);
  sfx.connect(master);
  master.connect(compressor);

  const noiseBuffer = createNoiseBuffer(context);

  return {
    context,
    master,
    ambience,
    sfx,
    noiseBuffer,
  };
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
  destination: AudioNode = graph.sfx,
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
  source.connect(filter).connect(gain).connect(destination);
  const availableOffset = Math.max(0, graph.noiseBuffer.duration - duration);
  source.start(start, Math.random() * availableOffset, duration);
}

function playNoiseSwell(
  graph: AudioGraph,
  start: number,
  duration: number,
  level: number,
  frequency: number,
  destination: AudioNode = graph.sfx,
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
  source.connect(filter).connect(gain).connect(destination);
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

function playAmbientTexture(graph: AudioGraph, mood: DiaryAudioMood) {
  const now = graph.context.currentTime + 0.04;

  if (mood === "cover") {
    return;
  }

  if (mood === "quiet") {
    return;
  }

  if (mood === "uneasy") {
    playNoiseSwell(graph, now, 1.25, 0.013, 560, graph.ambience);
    playTone(
      graph,
      68,
      now + 0.36,
      0.72,
      0.011,
      graph.ambience,
      "sine",
      51,
    );
    playKnock(graph, now + 1.02, 0.014, 71);
    return;
  }

  if (mood === "dread") {
    playTone(graph, 46, now, 0.22, 0.025, graph.ambience, "sine", 39);
    playTone(
      graph,
      43,
      now + 0.42,
      0.19,
      0.018,
      graph.ambience,
      "sine",
      37,
    );
    playNoise(
      graph,
      now + 0.04,
      0.055,
      0.012,
      "lowpass",
      220,
      0.5,
      graph.ambience,
    );
    playNoise(
      graph,
      now + 0.77,
      0.026,
      0.011,
      "highpass",
      2360,
      1.2,
      graph.ambience,
    );
    return;
  }

  playNoiseSwell(graph, now, 0.82, 0.007, 860, graph.ambience);
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
      playNoise(
        graph,
        now,
        0.17,
        0.056,
        "bandpass",
        1180 + Math.random() * 260,
        0.92 + Math.random() * 0.2,
      );
      playNoise(graph, now + 0.045, 0.2, 0.034, "bandpass", 720, 0.76);
      break;
    case "collect":
      playNoise(graph, now, 0.17, 0.046, "highpass", 1420, 0.82);
      playNoise(graph, now + 0.13, 0.04, 0.016, "lowpass", 360, 0.6);
      break;
    case "erase":
      playNoise(graph, now, 0.27, 0.045, "highpass", 820, 0.61);
      playNoise(graph, now + 0.07, 0.14, 0.016, "bandpass", 520, 0.5);
      break;
    case "pin":
      playNoise(graph, now, 0.04, 0.029, "highpass", 1840, 1.12);
      playTone(graph, 112, now, 0.13, 0.016, graph.sfx, "sine", 84);
      break;
    case "unpin":
      playNoise(graph, now, 0.055, 0.024, "bandpass", 840, 0.8);
      playTone(graph, 98, now, 0.12, 0.013, graph.sfx, "sine", 72);
      break;
    case "correct":
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
      playNoise(graph, now, 0.035, 0.024, "highpass", 1720, 1);
      playNoise(graph, now + 0.16, 0.03, 0.017, "highpass", 1600, 0.9);
      playTone(graph, 126, now + 0.02, 0.13, 0.011, graph.sfx, "sine", 101);
      break;
    case "crossout":
      playNoise(graph, now, 0.48, 0.078, "highpass", 1180, 0.64);
      playNoise(graph, now + 0.18, 0.22, 0.031, "bandpass", 560, 0.56);
      break;
    case "write":
      playNoise(graph, now, 0.38, 0.073, "highpass", 1440, 0.7);
      playNoise(graph, now + 0.34, 0.29, 0.052, "highpass", 1310, 0.66);
      playKnock(graph, now + 0.98, 0.034, 67);
      playKnock(graph, now + 1.36, 0.029, 64);
      playKnock(graph, now + 1.76, 0.024, 61);
      break;
    case "reveal":
      playNoiseSwell(graph, now, 1.42, 0.044, 470);
      playTone(graph, 54, now + 0.88, 0.82, 0.06, graph.sfx, "sine", 36);
      playKnock(graph, now + 1.28, 0.036, 62);
      break;
    case "select":
      playNoise(graph, now, 0.045, 0.021, "highpass", 1380, 0.88);
      playTone(graph, 101, now, 0.11, 0.011, graph.sfx, "sine", 80);
      break;
  }
}

export function useDiaryAudio(mood: DiaryAudioMood) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolumeState] = useState(0.58);
  const [ready, setReady] = useState(false);
  const [preferenceHydrated, setPreferenceHydrated] = useState(false);
  const graphRef = useRef<AudioGraph | null>(null);
  const enabledRef = useRef(enabled);
  const volumeRef = useRef(volume);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const getGraph = useCallback(() => {
    if (graphRef.current) return graphRef.current;
    const context = new AudioContext();
    const graph = buildAudioGraph(context);
    graphRef.current = graph;
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
  }, [ready, unlock]);

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
    if (!ready || !enabled || !graph) return;
    if (graph.context.state === "running") {
      playAmbientTexture(graph, mood);
    }
  }, [enabled, mood, ready]);

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
      const graph = graphRef.current;
      if (!graph) return;
      void graph.context.close();
      graphRef.current = null;
    },
    [],
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
