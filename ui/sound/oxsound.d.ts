// The sound module's API (round R4, B1). ./oxsound.js is the author's docs/design/sound/overexposed-sound.js, copied
// unchanged but for one added last line, `export { OXSound };` — never edited here: a new version replaces the
// reference and is copied again (validate checks the two). Every effect is synthesized in code from a fixed seed.

export type OXSoundBus = 'master' | 'sfx' | 'amb' | 'music';
export type OXAmbience = 'room' | 'rain' | 'wind';

export interface OXSoundApi {
  /** Creates the audio graph (from a gesture: browsers start audio only after one); again, resumes it. */
  init(ctx?: BaseAudioContext, opts?: { readonly raw?: boolean }): BaseAudioContext;
  /**
   * Renders the sampled sounds ahead of their first play (once): in a worker built from the module's own generators,
   * else, or if it fails, in idle moments. A sound played before its render is delivered renders on first use, on the
   * main thread. The theatre's reverb is built once this is done, or when first needed.
   */
  prepare(): void;
  /** Plays one sound; `when` is a context time, default now. An unknown name plays nothing. */
  play(name: string, when?: number): void;
  /** Starts (1.5 s fade in) or stops (1.2 s fade out) a loop. */
  ambience(name: OXAmbience, on: boolean): void;
  playing(name: string): boolean;
  volume(bus: OXSoundBus, v: number): void;
  /** The music bus: the game's player connects its sources here, each through its own gain. */
  musicBus(): GainNode;
  /** Suspends (true) or resumes (false) all sound, as while the page is hidden. */
  suspend(on: boolean): void;
  tap(): AnalyserNode;
  readonly names: readonly string[];
  readonly ambienceNames: readonly string[];
  readonly context: AudioContext | null;
}

export declare const OXSound: OXSoundApi;
