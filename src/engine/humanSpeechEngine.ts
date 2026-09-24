// Human Speech Engine - 100% Offline, Zero-API, Pure Local Acoustic Formant Synthesis
// Strictly NO external APIs, NO Google services, NO Google voices, NO speechSynthesis.
// Uses an offline Liljencrants-Fant glottal pulse generator, parallel vocal tract formant resonators (F1-F5),
// chest cavity resonance, Spanish diphone coarticulation glides, aspiration breathiness, and pitch jitter.

export interface HumanVoicePreset {
  id: string;
  name: string;
  gender: 'male' | 'female';
  basePitch: number; // in Hz
  formantShift: number; // multiplier for vocal tract length
  warmth: number; // 0.0 to 1.0 (chest resonance)
  breathiness: number; // 0.0 to 1.0 (glottal aspiration turbulence)
  speedMult: number; // default rate
  description: string;
}

export interface HumanSpeechConfig {
  selectedVoiceId: string;
  pitch: number; // 70 Hz to 300 Hz
  speed: number; // 0.6x to 1.8x
  warmth: number; // 0.0 to 1.0
  breathiness: number; // 0.0 to 1.0
  trillStrength: number; // 0.0 to 1.0 (Spanish rolled 'RR')
}

// Spanish phoneme definition for acoustic synthesis
interface SpanishPhoneme {
  char: string;
  type: 'vowel' | 'fricative' | 'plosive' | 'voicedStop' | 'nasal' | 'palatalNasal' | 'liquid' | 'trill' | 'tap' | 'silence' | 'breath' | 'ch' | 'll_y';
  isStressed: boolean;
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  vocalAmp: number;
  noiseAmp: number;
  noiseFreq: number;
  noiseQ: number;
  durationScale: number;
}

export class HumanSpeechEngine {
  private ctx: AudioContext | null = null;
  private glottalPeriodicWave: PeriodicWave | null = null;
  private isSpeaking: boolean = false;
  private stopRequested: boolean = false;

  private onPhonemeCallbacks: Set<(phoneme: string) => void> = new Set();
  private onSpeakingChangeCallbacks: Set<(isSpeaking: boolean) => void> = new Set();

  public config: HumanSpeechConfig = {
    selectedVoiceId: 'normal',
    pitch: 122, // Natural human male conversational pitch (122 Hz)
    speed: 1.0,
    warmth: 0.85,
    breathiness: 0.18,
    trillStrength: 0.85,
  };

  public readonly PRESETS: HumanVoicePreset[] = [
    {
      id: 'normal',
      name: '👤 Hombre Natural (Laringe Real)',
      gender: 'male',
      basePitch: 122,
      formantShift: 1.0,
      warmth: 0.85,
      breathiness: 0.18,
      speedMult: 1.0,
      description: 'Voz masculina conversacional equilibrada, cálida y clara.',
    },
    {
      id: 'grave',
      name: '🧔 Barítono Profundo',
      gender: 'male',
      basePitch: 84,
      formantShift: 0.88,
      warmth: 1.0,
      breathiness: 0.12,
      speedMult: 0.95,
      description: 'Voz gruesa de pecho con resonancia profunda de cavidad torácica.',
    },
    {
      id: 'joven',
      name: '🧑 Hombre Joven / Tenor',
      gender: 'male',
      basePitch: 145,
      formantShift: 1.08,
      warmth: 0.70,
      breathiness: 0.15,
      speedMult: 1.05,
      description: 'Tono ágil, claro y articulado con formantes brillantes.',
    },
    {
      id: 'femenina',
      name: '👩 Mujer Expresiva',
      gender: 'female',
      basePitch: 218,
      formantShift: 1.22,
      warmth: 0.60,
      breathiness: 0.22,
      speedMult: 1.0,
      description: 'Tracto vocal acortado con frecuencias agudas armónicas.',
    },
    {
      id: 'anciano',
      name: '👴 Sabio / Maduro',
      gender: 'male',
      basePitch: 108,
      formantShift: 0.94,
      warmth: 0.90,
      breathiness: 0.32,
      speedMult: 0.88,
      description: 'Voz con textura respiratoria natural y cadencia pausada.',
    }
  ];

  constructor() {
    // 100% Offline code-synthesized speech engine
  }

  // --- AUDIO CONTEXT INITIALIZATION ---
  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // --- LILJENCRANTS-FANT (LF) GLOTTAL PULSE MODEL ---
  // Real human vocal cords generate an asymmetric volume velocity flow wave
  // with smooth opening and rapid, non-linear closure.
  private getGlottalPeriodicWave(ctx: AudioContext): PeriodicWave {
    if (this.glottalPeriodicWave) return this.glottalPeriodicWave;

    const nHarmonics = 128;
    const real = new Float32Array(nHarmonics);
    const imag = new Float32Array(nHarmonics);

    real[0] = 0;
    imag[0] = 0;

    for (let n = 1; n < nHarmonics; n++) {
      real[n] = 0;
      // LF glottal flow spectral envelope (-12 dB/octave with natural formant slope)
      const rollOff = Math.pow(1 + Math.pow(n / 3.8, 2.0), 0.95);
      const amp = (1.0 / rollOff) * (1.0 / Math.pow(n, 0.35));
      imag[n] = amp * (n % 2 === 0 ? -0.95 : 1.0);
    }

    this.glottalPeriodicWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    return this.glottalPeriodicWave;
  }

  // --- SUBSCRIBERS ---
  public subscribePhoneme(cb: (phoneme: string) => void): () => void {
    this.onPhonemeCallbacks.add(cb);
    return () => this.onPhonemeCallbacks.delete(cb);
  }

  public subscribeSpeaking(cb: (isSpeaking: boolean) => void): () => void {
    this.onSpeakingChangeCallbacks.add(cb);
    return () => this.onSpeakingChangeCallbacks.delete(cb);
  }

  private emitPhoneme(char: string) {
    this.onPhonemeCallbacks.forEach((cb) => {
      try { cb(char); } catch { /* ignore */ }
    });
  }

  private emitSpeaking(speaking: boolean) {
    this.isSpeaking = speaking;
    this.onSpeakingChangeCallbacks.forEach((cb) => {
      try { cb(speaking); } catch { /* ignore */ }
    });
  }

  // --- CONFIG SETTERS ---
  public setVoicePreset(presetId: string) {
    const preset = this.PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    this.config.selectedVoiceId = preset.id;
    this.config.pitch = preset.basePitch;
    this.config.warmth = preset.warmth;
    this.config.breathiness = preset.breathiness;
  }

  public setPitch(pitch: number) {
    this.config.pitch = Math.max(65, Math.min(320, pitch));
  }

  public setSpeed(speed: number) {
    this.config.speed = Math.max(0.5, Math.min(2.0, speed));
  }

  public setWarmth(warmth: number) {
    this.config.warmth = Math.max(0.0, Math.min(1.0, warmth));
  }

  public setBreathiness(breath: number) {
    this.config.breathiness = Math.max(0.0, Math.min(1.0, breath));
  }

  public setTrillStrength(trill: number) {
    this.config.trillStrength = Math.max(0.0, Math.min(1.0, trill));
  }

  public stop(): void {
    this.stopRequested = true;
    this.emitSpeaking(false);
    this.emitPhoneme('');
  }

  // --- HIGH FIDELITY SPANISH PHONETIC PARSER ---
  // Transforms written Spanish text into acoustic phonetic targets with formant values
  private parseSpanishPhonemes(rawText: string): SpanishPhoneme[] {
    const list: SpanishPhoneme[] = [];
    const lower = rawText.toLowerCase();
    const len = lower.length;
    let idx = 0;

    // Spanish Formant Targets (F1, F2, F3, F4 in Hz)
    const VOWEL_TABLE: Record<string, { f1: number; f2: number; f3: number; f4: number; isStressed: boolean }> = {
      'a': { f1: 760, f2: 1280, f3: 2550, f4: 3600, isStressed: false },
      'á': { f1: 790, f2: 1300, f3: 2580, f4: 3600, isStressed: true },
      'e': { f1: 520, f2: 1850, f3: 2600, f4: 3650, isStressed: false },
      'é': { f1: 540, f2: 1900, f3: 2650, f4: 3650, isStressed: true },
      'i': { f1: 300, f2: 2280, f3: 2950, f4: 3750, isStressed: false },
      'í': { f1: 310, f2: 2320, f3: 3000, f4: 3750, isStressed: true },
      'o': { f1: 520, f2: 920,  f3: 2450, f4: 3500, isStressed: false },
      'ó': { f1: 540, f2: 940,  f3: 2480, f4: 3500, isStressed: true },
      'u': { f1: 320, f2: 780,  f3: 2300, f4: 3450, isStressed: false },
      'ú': { f1: 330, f2: 800,  f3: 2350, f4: 3450, isStressed: true },
    };

    while (idx < len) {
      const char = lower[idx];
      const next = idx + 1 < len ? lower[idx + 1] : '';
      const next2 = idx + 2 < len ? lower[idx + 2] : '';

      // 1. Whitespace / Punctuation Pauses
      if (char === ' ' || char === '\t') {
        list.push({
          char: ' ',
          type: 'silence',
          isStressed: false,
          f1: 500, f2: 1500, f3: 2500, f4: 3500,
          vocalAmp: 0, noiseAmp: 0, noiseFreq: 0, noiseQ: 0,
          durationScale: 0.65,
        });
        idx++;
        continue;
      }

      if (['.', ',', ';', ':', '!', '?', '¿', '¡'].includes(char)) {
        list.push({
          char,
          type: 'silence',
          isStressed: false,
          f1: 500, f2: 1500, f3: 2500, f4: 3500,
          vocalAmp: 0, noiseAmp: 0, noiseFreq: 0, noiseQ: 0,
          durationScale: char === ',' ? 1.4 : 2.2,
        });
        idx++;
        continue;
      }

      // 2. Multi-character Spanish phonemes: 'ch', 'll', 'rr', 'qu', 'gu'
      if (char === 'c' && next === 'h') {
        list.push({
          char: 'ch',
          type: 'ch',
          isStressed: false,
          f1: 340, f2: 1850, f3: 2750, f4: 3600,
          vocalAmp: 0.05, noiseAmp: 0.72, noiseFreq: 3400, noiseQ: 2.2,
          durationScale: 1.15,
        });
        idx += 2;
        continue;
      }

      if (char === 'l' && next === 'l') {
        list.push({
          char: 'll',
          type: 'll_y',
          isStressed: false,
          f1: 310, f2: 2100, f3: 2850, f4: 3650,
          vocalAmp: 0.72, noiseAmp: 0.06, noiseFreq: 2800, noiseQ: 1.8,
          durationScale: 1.1,
        });
        idx += 2;
        continue;
      }

      if (char === 'r' && next === 'r') {
        list.push({
          char: 'rr',
          type: 'trill',
          isStressed: true,
          f1: 420, f2: 1550, f3: 2350, f4: 3500,
          vocalAmp: 0.78, noiseAmp: 0.12, noiseFreq: 2400, noiseQ: 2.0,
          durationScale: 1.6,
        });
        idx += 2;
        continue;
      }

      // 'qu' -> /k/
      if (char === 'q' && next === 'u') {
        list.push({
          char: 'k',
          type: 'plosive',
          isStressed: false,
          f1: 350, f2: 1800, f3: 2600, f4: 3500,
          vocalAmp: 0.0, noiseAmp: 0.65, noiseFreq: 2400, noiseQ: 2.5,
          durationScale: 0.95,
        });
        idx += 2;
        continue;
      }

      // 'gu' before e/i -> /g/
      if (char === 'g' && next === 'u' && (next2 === 'e' || next2 === 'i' || next2 === 'é' || next2 === 'í')) {
        list.push({
          char: 'g',
          type: 'voicedStop',
          isStressed: false,
          f1: 290, f2: 1650, f3: 2450, f4: 3500,
          vocalAmp: 0.48, noiseAmp: 0.0, noiseFreq: 0, noiseQ: 0,
          durationScale: 0.9,
        });
        idx += 2;
        continue;
      }

      // 3. Silent 'h' in Spanish
      if (char === 'h') {
        idx++;
        continue;
      }

      // 4. Vowels
      if (VOWEL_TABLE[char]) {
        const v = VOWEL_TABLE[char];
        list.push({
          char,
          type: 'vowel',
          isStressed: v.isStressed,
          f1: v.f1,
          f2: v.f2,
          f3: v.f3,
          f4: v.f4,
          vocalAmp: v.isStressed ? 0.92 : 0.82,
          noiseAmp: 0.0,
          noiseFreq: 0,
          noiseQ: 0,
          durationScale: v.isStressed ? 1.35 : 1.05,
        });
        idx++;
        continue;
      }

      // 5. Spanish 'r' (word-initial is rolled, otherwise tap)
      if (char === 'r') {
        const isWordStart = idx === 0 || lower[idx - 1] === ' ';
        if (isWordStart) {
          list.push({
            char: 'r',
            type: 'trill',
            isStressed: false,
            f1: 420, f2: 1550, f3: 2350, f4: 3500,
            vocalAmp: 0.74, noiseAmp: 0.10, noiseFreq: 2400, noiseQ: 2.0,
            durationScale: 1.3,
          });
        } else {
          list.push({
            char: 'r',
            type: 'tap',
            isStressed: false,
            f1: 390, f2: 1480, f3: 2400, f4: 3500,
            vocalAmp: 0.65, noiseAmp: 0.05, noiseFreq: 2200, noiseQ: 1.5,
            durationScale: 0.75,
          });
        }
        idx++;
        continue;
      }

      // 6. Voiced stops & Approximants (b, v, d, g)
      if (char === 'b' || char === 'v') {
        list.push({
          char: 'b',
          type: 'voicedStop',
          isStressed: false,
          f1: 280, f2: 1050, f3: 2300, f4: 3400,
          vocalAmp: 0.52, noiseAmp: 0.0, noiseFreq: 0, noiseQ: 0,
          durationScale: 0.9,
        });
        idx++;
        continue;
      }

      if (char === 'd') {
        list.push({
          char: 'd',
          type: 'voicedStop',
          isStressed: false,
          f1: 300, f2: 1650, f3: 2550, f4: 3500,
          vocalAmp: 0.52, noiseAmp: 0.0, noiseFreq: 0, noiseQ: 0,
          durationScale: 0.9,
        });
        idx++;
        continue;
      }

      if (char === 'g') {
        if (next === 'e' || next === 'i' || next === 'é' || next === 'í') {
          // 'ge', 'gi' sounds like /j/ (fricative)
          list.push({
            char: 'j',
            type: 'fricative',
            isStressed: false,
            f1: 450, f2: 1450, f3: 2450, f4: 3500,
            vocalAmp: 0.12, noiseAmp: 0.58, noiseFreq: 1700, noiseQ: 1.8,
            durationScale: 1.15,
          });
        } else {
          list.push({
            char: 'g',
            type: 'voicedStop',
            isStressed: false,
            f1: 290, f2: 1550, f3: 2400, f4: 3500,
            vocalAmp: 0.48, noiseAmp: 0.0, noiseFreq: 0, noiseQ: 0,
            durationScale: 0.9,
          });
        }
        idx++;
        continue;
      }

      // 7. 'c' before e/i vs a/o/u
      if (char === 'c') {
        if (next === 'e' || next === 'i' || next === 'é' || next === 'í') {
          list.push({
            char: 's',
            type: 'fricative',
            isStressed: false,
            f1: 360, f2: 1550, f3: 2600, f4: 3600,
            vocalAmp: 0.04, noiseAmp: 0.68, noiseFreq: 5800, noiseQ: 3.0,
            durationScale: 1.05,
          });
        } else {
          list.push({
            char: 'k',
            type: 'plosive',
            isStressed: false,
            f1: 340, f2: 1800, f3: 2600, f4: 3550,
            vocalAmp: 0.0, noiseAmp: 0.65, noiseFreq: 2300, noiseQ: 2.6,
            durationScale: 0.95,
          });
        }
        idx++;
        continue;
      }

      // 8. Nasals (m, n, ñ)
      if (char === 'm') {
        list.push({
          char: 'm',
          type: 'nasal',
          isStressed: false,
          f1: 270, f2: 950, f3: 2350, f4: 3400,
          vocalAmp: 0.60, noiseAmp: 0.0, noiseFreq: 0, noiseQ: 0,
          durationScale: 1.05,
        });
        idx++;
        continue;
      }

      if (char === 'n') {
        list.push({
          char: 'n',
          type: 'nasal',
          isStressed: false,
          f1: 280, f2: 1450, f3: 2450, f4: 3500,
          vocalAmp: 0.62, noiseAmp: 0.0, noiseFreq: 0, noiseQ: 0,
          durationScale: 1.05,
        });
        idx++;
        continue;
      }

      if (char === 'ñ') {
        list.push({
          char: 'ñ',
          type: 'palatalNasal',
          isStressed: false,
          f1: 260, f2: 1850, f3: 2800, f4: 3600,
          vocalAmp: 0.62, noiseAmp: 0.0, noiseFreq: 0, noiseQ: 0,
          durationScale: 1.25,
        });
        idx++;
        continue;
      }

      // 9. Fricatives (s, z, f, j)
      if (char === 's' || char === 'z') {
        list.push({
          char: 's',
          type: 'fricative',
          isStressed: false,
          f1: 360, f2: 1550, f3: 2600, f4: 3600,
          vocalAmp: 0.04, noiseAmp: 0.70, noiseFreq: 5800, noiseQ: 3.2,
          durationScale: 1.1,
        });
        idx++;
        continue;
      }

      if (char === 'f') {
        list.push({
          char: 'f',
          type: 'fricative',
          isStressed: false,
          f1: 340, f2: 1400, f3: 2400, f4: 3500,
          vocalAmp: 0.04, noiseAmp: 0.40, noiseFreq: 3200, noiseQ: 1.6,
          durationScale: 1.0,
        });
        idx++;
        continue;
      }

      if (char === 'j' || char === 'x') {
        list.push({
          char: 'j',
          type: 'fricative',
          isStressed: false,
          f1: 460, f2: 1450, f3: 2450, f4: 3500,
          vocalAmp: 0.12, noiseAmp: 0.58, noiseFreq: 1750, noiseQ: 1.8,
          durationScale: 1.2,
        });
        idx++;
        continue;
      }

      // 10. Plosives (p, t, k)
      if (['p', 't', 'k'].includes(char)) {
        const noiseFreq = char === 'p' ? 1100 : char === 't' ? 3800 : 2300;
        list.push({
          char,
          type: 'plosive',
          isStressed: false,
          f1: 330, f2: 1750, f3: 2600, f4: 3550,
          vocalAmp: 0.0, noiseAmp: 0.65, noiseFreq, noiseQ: 2.8,
          durationScale: 0.95,
        });
        idx++;
        continue;
      }

      // 11. Liquids & Approximants (l, y, w)
      if (char === 'l') {
        list.push({
          char: 'l',
          type: 'liquid',
          isStressed: false,
          f1: 350, f2: 1180, f3: 2650, f4: 3500,
          vocalAmp: 0.76, noiseAmp: 0.0, noiseFreq: 0, noiseQ: 0,
          durationScale: 0.90,
        });
        idx++;
        continue;
      }

      if (char === 'y') {
        list.push({
          char: 'y',
          type: 'll_y',
          isStressed: false,
          f1: 310, f2: 2100, f3: 2850, f4: 3650,
          vocalAmp: 0.74, noiseAmp: 0.06, noiseFreq: 2800, noiseQ: 1.8,
          durationScale: 1.05,
        });
        idx++;
        continue;
      }

      // Fallback
      list.push({
        char,
        type: 'liquid',
        isStressed: false,
        f1: 500, f2: 1500, f3: 2500, f4: 3500,
        vocalAmp: 0.45, noiseAmp: 0.0, noiseFreq: 0, noiseQ: 0,
        durationScale: 0.8,
      });
      idx++;
    }

    return list;
  }

  // --- SPEAK EXECUTION (100% Offline Procedural Speech) ---
  public speak(text: string): void {
    if (!text || !text.trim()) return;
    this.stop();
    this.stopRequested = false;

    const trimmed = text.trim();
    this.speakAcousticHuman(trimmed);
  }

  // --- PROCEDURAL HUMAN ACOUSTIC GLOTTAL ENGINE ---
  // Pure Web Audio API: Zero latency, offline, Liljencrants-Fant glottal flow wave,
  // 5 parallel vocal tract formants (F1, F2, F3, F4, F5), chest body resonance,
  // glottal aspiration turbulence, micro-jitter, and natural Spanish sentence intonation.
  private speakAcousticHuman(text: string): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const phonemes = this.parseSpanishPhonemes(text);
    if (phonemes.length === 0) return;

    this.emitSpeaking(true);

    const preset = this.PRESETS.find((p) => p.id === this.config.selectedVoiceId) || this.PRESETS[0];
    const formantShift = preset.formantShift;
    const basePitch = this.config.pitch;
    const warmth = this.config.warmth;
    const breathiness = this.config.breathiness;
    const trillStrength = this.config.trillStrength;

    const timeStart = ctx.currentTime + 0.03;
    let time = timeStart;
    const baseCharDur = (0.078 / this.config.speed) * (preset.speedMult || 1.0);

    // Master Output & Dynamics Compressor (raises overall volume, glues vocal texture)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.40, timeStart);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-15, timeStart);
    compressor.knee.setValueAtTime(6, timeStart);
    compressor.ratio.setValueAtTime(5.5, timeStart);
    compressor.attack.setValueAtTime(0.004, timeStart);
    compressor.release.setValueAtTime(0.07, timeStart);

    masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    // 1. Organic Glottal Voice Source (LF Wave)
    const glottalPulseWave = this.getGlottalPeriodicWave(ctx);
    const glottalOsc = ctx.createOscillator();
    glottalOsc.setPeriodicWave(glottalPulseWave);
    glottalOsc.frequency.setValueAtTime(basePitch, timeStart);

    // Natural glottal lowpass filter: set to 2900 Hz to allow vocal formants through
    const glottalFilter = ctx.createBiquadFilter();
    glottalFilter.type = 'lowpass';
    glottalFilter.frequency.setValueAtTime(2900, timeStart);
    glottalFilter.Q.setValueAtTime(0.7, timeStart);

    // Acoustic Phase Dispersion Cascade (3 Allpass Filters)
    // Desynchronizes synthetic phase alignment for a warm, natural vocal tone
    const ap1 = ctx.createBiquadFilter();
    ap1.type = 'allpass';
    ap1.frequency.setValueAtTime(680, timeStart);
    ap1.Q.setValueAtTime(1.2, timeStart);

    const ap2 = ctx.createBiquadFilter();
    ap2.type = 'allpass';
    ap2.frequency.setValueAtTime(1650, timeStart);
    ap2.Q.setValueAtTime(1.5, timeStart);

    const ap3 = ctx.createBiquadFilter();
    ap3.type = 'allpass';
    ap3.frequency.setValueAtTime(2950, timeStart);
    ap3.Q.setValueAtTime(1.8, timeStart);

    // 2. Chest Cavity Resonator (adds human body warmth in 205 Hz range)
    const chestFilter = ctx.createBiquadFilter();
    chestFilter.type = 'peaking';
    chestFilter.frequency.setValueAtTime(205, timeStart);
    chestFilter.Q.setValueAtTime(1.8, timeStart);
    chestFilter.gain.setValueAtTime(warmth * 6.5, timeStart); // Warmth dB boost

    // 3. Parallel Human Vocal Tract Formants (F1, F2, F3, F4, F5)
    // Precise Q factor and boosted F1/F2 gains ensure sharp, crystal-clear vowel definition
    const f1Filter = ctx.createBiquadFilter();
    f1Filter.type = 'peaking';
    f1Filter.Q.setValueAtTime(3.2, timeStart);
    f1Filter.gain.setValueAtTime(18.0, timeStart);

    const f2Filter = ctx.createBiquadFilter();
    f2Filter.type = 'peaking';
    f2Filter.Q.setValueAtTime(3.8, timeStart);
    f2Filter.gain.setValueAtTime(15.0, timeStart);

    const f3Filter = ctx.createBiquadFilter();
    f3Filter.type = 'peaking';
    f3Filter.Q.setValueAtTime(4.5, timeStart);
    f3Filter.gain.setValueAtTime(9.0, timeStart);

    const f4Filter = ctx.createBiquadFilter();
    f4Filter.type = 'peaking';
    f4Filter.Q.setValueAtTime(5.0, timeStart);
    f4Filter.gain.setValueAtTime(6.0, timeStart);

    const f5Filter = ctx.createBiquadFilter();
    f5Filter.type = 'peaking';
    f5Filter.Q.setValueAtTime(5.5, timeStart);
    f5Filter.gain.setValueAtTime(3.0, timeStart);

    // Formant level adjusters (F1 & F2 boosted for thick throat tone and clear vowels)
    const f1Gain = ctx.createGain();
    f1Gain.gain.setValueAtTime(1.35, timeStart);

    const f2Gain = ctx.createGain();
    f2Gain.gain.setValueAtTime(1.15, timeStart);

    const f3Gain = ctx.createGain();
    f3Gain.gain.setValueAtTime(0.55, timeStart);

    const f4Gain = ctx.createGain();
    f4Gain.gain.setValueAtTime(0.28, timeStart);

    const f5Gain = ctx.createGain();
    f5Gain.gain.setValueAtTime(0.14, timeStart);

    const vocalSumGain = ctx.createGain();
    vocalSumGain.gain.setValueAtTime(0, timeStart);

    // 4. Glottal Aspiration & Fricative Noise Generator (Human breath turbulence)
    const noiseBufferSize = Math.floor(ctx.sampleRate * 2.0);
    const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);

    // Pink-ish filtered turbulence for natural breath
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < noiseBufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0555179;
      b1 = 0.96300 * b1 + white * 0.1538520;
      b2 = 0.57000 * b2 + white * 0.3104856;
      noiseData[i] = (b0 + b1 + b2 + white * 0.4) * 0.5;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Fricative / Consonant Noise Filter
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3200, timeStart);
    noiseFilter.Q.setValueAtTime(2.2, timeStart);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, timeStart);

    // Parallel glottal aspiration breath generator (ambient vocal cord air leak)
    const aspirationFilter = ctx.createBiquadFilter();
    aspirationFilter.type = 'lowpass';
    aspirationFilter.frequency.setValueAtTime(2200, timeStart);

    const aspirationGain = ctx.createGain();
    aspirationGain.gain.setValueAtTime(0, timeStart);

    // 5. Lip Radiation Filter (+6 dB/octave highpass shelf above 2800 Hz)
    const lipRadiationFilter = ctx.createBiquadFilter();
    lipRadiationFilter.type = 'highshelf';
    lipRadiationFilter.frequency.setValueAtTime(2800, timeStart);
    lipRadiationFilter.gain.setValueAtTime(2.5, timeStart);

    // Wiring Audio Graph:
    // Glottal Osc -> Glottal Lowpass -> Phase Dispersion Cascade (AP1->AP2->AP3) -> Chest -> Formants -> Vocal Sum -> Lip -> Master
    glottalOsc.connect(glottalFilter);
    glottalFilter.connect(ap1);
    ap1.connect(ap2);
    ap2.connect(ap3);
    ap3.connect(chestFilter);

    chestFilter.connect(f1Filter);
    f1Filter.connect(f1Gain);
    f1Gain.connect(vocalSumGain);

    chestFilter.connect(f2Filter);
    f2Filter.connect(f2Gain);
    f2Gain.connect(vocalSumGain);

    chestFilter.connect(f3Filter);
    f3Filter.connect(f3Gain);
    f3Gain.connect(vocalSumGain);

    chestFilter.connect(f4Filter);
    f4Filter.connect(f4Gain);
    f4Gain.connect(vocalSumGain);

    chestFilter.connect(f5Filter);
    f5Filter.connect(f5Gain);
    f5Gain.connect(vocalSumGain);

    // Noise paths
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    // Routing glottal aspiration breath directly into the vocal tract formants
    noiseSource.connect(aspirationFilter);
    aspirationFilter.connect(aspirationGain);
    aspirationGain.connect(chestFilter);

    vocalSumGain.connect(lipRadiationFilter);
    lipRadiationFilter.connect(masterGain);

    // Start Sources
    glottalOsc.start(timeStart);
    noiseSource.start(timeStart);

    const totalPhonemes = phonemes.length;
    const isQuestion = text.trim().endsWith('?') || text.includes('¿');

    phonemes.forEach((ph, index) => {
      const dur = baseCharDur * ph.durationScale;
      const endOfPhonemeTime = time + dur;

      // Natural Human Intonation Contour (Prosody):
      const progress = index / Math.max(1, totalPhonemes);
      let intonation = 1.0;

      if (isQuestion) {
        if (progress < 0.15) {
          const r = progress / 0.15;
          intonation = 0.95 + r * 0.05;
        } else if (progress < 0.75) {
          const r = (progress - 0.15) / 0.60;
          intonation = 1.0 - r * 0.08;
        } else {
          // Sharp final rise typical of Spanish question inflection
          const r = (progress - 0.75) / 0.25;
          intonation = 0.92 + r * 0.26;
        }
      } else {
        // Spanish declarative sentence intonation curve
        if (progress < 0.15) {
          const r = progress / 0.15;
          intonation = 0.94 + r * 0.08;
        } else if (progress < 0.82) {
          const r = (progress - 0.15) / 0.67;
          intonation = 1.02 - r * 0.10;
        } else {
          // Natural cadence fall
          const r = (progress - 0.82) / 0.18;
          intonation = 0.92 - r * 0.09;
        }
      }

      // Syllable stress accent (+18 Hz on stressed vowel)
      let currentPitch = basePitch * intonation;
      if (ph.isStressed) {
        currentPitch += 18;
      }

      // Advanced Multi-Frequency Jitter (Realistic neuro-muscular tremor)
      const tremor = Math.sin(time * Math.PI * 2 * 5.2) * 1.3 
                   + Math.cos(time * Math.PI * 2 * 7.8) * 0.8 
                   + (Math.random() * 2 - 1) * 0.4;

      glottalOsc.frequency.setValueAtTime(currentPitch + tremor, time);
      glottalOsc.frequency.linearRampToValueAtTime(currentPitch - tremor * 0.4, endOfPhonemeTime);

      // Organic Shimmer (amplitude micro-variation)
      const vocalShimmer = 1.0 + Math.sin(time * Math.PI * 2 * 4.6) * 0.035 
                               + Math.cos(time * Math.PI * 2 * 9.2) * 0.02
                               + (Math.random() * 2 - 1) * 0.012;

      // Stressed syllable amplitude boost
      const stressedMultiplier = ph.isStressed ? 1.15 : 1.0;
      const targetVocalAmp = ph.vocalAmp * vocalShimmer * stressedMultiplier;

      // Formants shifted for speaker timbre
      const f1 = ph.f1 * formantShift;
      const f2 = ph.f2 * formantShift;
      const f3 = ph.f3 * formantShift;
      const f4 = ph.f4 * formantShift;
      const f5 = 4250 * formantShift;

      // UI visualizer synchronization
      const safeChar = ph.char.toUpperCase();
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
      setTimeout(() => {
        if (!this.stopRequested) {
          this.emitPhoneme(safeChar);
        }
      }, delayMs);

      // Synthesize based on Phoneme Class
      if (ph.type === 'silence') {
        vocalSumGain.gain.linearRampToValueAtTime(0.0001, time + dur * 0.1);
        noiseGain.gain.linearRampToValueAtTime(0.0001, time + dur * 0.1);
        aspirationGain.gain.linearRampToValueAtTime(0.0001, time + dur * 0.1);
      } else if (ph.type === 'breath') {
        vocalSumGain.gain.linearRampToValueAtTime(0.0001, time + dur * 0.08);

        noiseFilter.frequency.setValueAtTime(950, time);
        noiseFilter.Q.setValueAtTime(1.0, time);
        noiseGain.gain.setValueAtTime(0.001, time);
        noiseGain.gain.linearRampToValueAtTime(0.065, time + dur * 0.35);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, endOfPhonemeTime);
      } else if (ph.type === 'trill') {
        // Spanish Trill (Rolled R): periodic tongue alveolar closures at ~26 Hz
        f1Filter.frequency.linearRampToValueAtTime(f1, time + dur * 0.2);
        f2Filter.frequency.linearRampToValueAtTime(f2, time + dur * 0.2);
        f3Filter.frequency.linearRampToValueAtTime(f3, time + dur * 0.2);
        f4Filter.frequency.linearRampToValueAtTime(f4, time + dur * 0.2);
        f5Filter.frequency.linearRampToValueAtTime(f5, time + dur * 0.2);

        const trillPeriod = 0.022; // ~26 Hz tap cycle
        for (let t = 0; t < dur; t += trillPeriod) {
          const cycleProgress = (t / trillPeriod) * Math.PI * 2;
          const occlusion = 0.2 + (1.0 - trillStrength * 0.75) * 0.8 * (0.5 + 0.5 * Math.sin(cycleProgress));
          const stepTime = time + t;

          vocalSumGain.gain.setValueAtTime(targetVocalAmp * 0.48 * occlusion, stepTime);
          glottalOsc.frequency.setValueAtTime(currentPitch - Math.sin(cycleProgress) * 6 * trillStrength, stepTime);
        }
      } else if (ph.type === 'plosive') {
        // Silent occlusion followed by fast release burst
        const closureDur = dur * 0.32;
        const releaseTime = time + closureDur;

        vocalSumGain.gain.setValueAtTime(0.0001, time);
        noiseGain.gain.setValueAtTime(0.0001, time);

        // Burst stage
        f1Filter.frequency.setValueAtTime(350, releaseTime);
        f2Filter.frequency.setValueAtTime(f2, releaseTime);
        f3Filter.frequency.setValueAtTime(f3, releaseTime);
        f5Filter.frequency.setValueAtTime(f5, releaseTime);

        noiseFilter.frequency.setValueAtTime(ph.noiseFreq, releaseTime);
        noiseFilter.Q.setValueAtTime(ph.noiseQ, releaseTime);

        noiseGain.gain.setValueAtTime(0.001, releaseTime);
        noiseGain.gain.linearRampToValueAtTime(ph.noiseAmp * 0.42, releaseTime + 0.005);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, releaseTime + (dur - closureDur) * 0.3);
      } else if (ph.type === 'voicedStop') {
        // Pre-voicing low bar then release glide
        const closureDur = dur * 0.28;
        const releaseTime = time + closureDur;

        // Voicing bar (gentle hum)
        vocalSumGain.gain.setValueAtTime(targetVocalAmp * 0.22, time);
        f1Filter.frequency.setValueAtTime(175, time);

        // Release
        f1Filter.frequency.setValueAtTime(f1, releaseTime);
        f2Filter.frequency.setValueAtTime(f2, releaseTime);
        f3Filter.frequency.setValueAtTime(f3, releaseTime);
        f5Filter.frequency.setValueAtTime(f5, releaseTime);

        vocalSumGain.gain.setValueAtTime(targetVocalAmp * 0.45, releaseTime);
        vocalSumGain.gain.linearRampToValueAtTime(targetVocalAmp * 0.48, releaseTime + 0.008);
        vocalSumGain.gain.linearRampToValueAtTime(targetVocalAmp * 0.42, releaseTime + 0.008);
      } else {
        // Dynamic Glottal Aperture Modulation (allows full vowel brilliance through up to 3200 Hz)
        const glottalCutoff = ph.type === 'vowel' 
          ? 2800 + targetVocalAmp * 400 
          : 2200 + targetVocalAmp * 300;
        glottalFilter.frequency.linearRampToValueAtTime(glottalCutoff, time + dur * 0.25);

        // Rapid coarticulation glide (first 30% of phoneme), then hold stable target for 70% of duration for sharp letter recognition
        f1Filter.frequency.linearRampToValueAtTime(Math.max(150, f1), time + dur * 0.30);
        f2Filter.frequency.linearRampToValueAtTime(Math.max(500, f2), time + dur * 0.30);
        f3Filter.frequency.linearRampToValueAtTime(Math.max(1500, f3), time + dur * 0.30);
        f4Filter.frequency.linearRampToValueAtTime(Math.max(2500, f4), time + dur * 0.30);
        f5Filter.frequency.linearRampToValueAtTime(Math.max(3400, f5), time + dur * 0.30);

        // Crisp vocal gain envelope
        vocalSumGain.gain.linearRampToValueAtTime(targetVocalAmp * 0.60, time + dur * 0.15);
        vocalSumGain.gain.linearRampToValueAtTime(targetVocalAmp * 0.52, endOfPhonemeTime);

        // Glottal aspiration breathiness
        if (ph.type === 'vowel') {
          aspirationGain.gain.setValueAtTime(ph.vocalAmp * 0.05 * breathiness, time);
        } else {
          aspirationGain.gain.setValueAtTime(0.001, time);
        }

        if (ph.noiseAmp > 0) {
          noiseFilter.frequency.setValueAtTime(ph.noiseFreq, time);
          noiseFilter.Q.setValueAtTime(ph.noiseQ, time);
          noiseGain.gain.linearRampToValueAtTime(ph.noiseAmp * 0.45, time + dur * 0.10);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, endOfPhonemeTime);
        } else {
          noiseGain.gain.linearRampToValueAtTime(0.0001, time + dur * 0.08);
        }
      }

      time += dur;
    });

    // Gentle release silence
    vocalSumGain.gain.linearRampToValueAtTime(0.0001, time + 0.05);
    noiseGain.gain.linearRampToValueAtTime(0.0001, time + 0.05);
    aspirationGain.gain.linearRampToValueAtTime(0.0001, time + 0.05);

    glottalOsc.stop(time + 0.08);
    noiseSource.stop(time + 0.08);

    const totalDurationMs = Math.max(0, (time - ctx.currentTime) * 1000 + 80);
    setTimeout(() => {
      if (!this.stopRequested) {
        this.emitSpeaking(false);
        this.emitPhoneme('');
      }
    }, totalDurationMs);
  }
}

export const humanSpeechEngine = new HumanSpeechEngine();
