import { SCENE_IDS, SEASON_IDS, type SceneId, type SeasonId } from '../../core/index.ts';
import { content } from '../content.ts';
import { t } from '../i18n.ts';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../Stage.tsx';
import { cachePhotoBlob, photoUrl, renderLightCanvas, renderTitleCanvas, type PhotoJob } from './halftone.ts';

let title: Promise<string> | null = null;
let titleReady: string | null = null;

/** The widest title photograph drawn: a 4K screen's. */
const WIDEST = 3840;

/**
 * The stage's own factor: its scale on the screen × the device pixel ratio — how many device pixels a stage pixel
 * takes. The stage fits the window (ui/Stage.tsx), so it is known from the window before anything mounts (round R5,
 * B8). The title's photograph and the season cards' ovals are drawn at it (round R8a, D2).
 */
function stageFactor(): number {
  const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT) || 1;
  return scale * (window.devicePixelRatio || 1);
}

/** The title photograph's size: the stage's on the screen, in device pixels. */
function titleSize(): { readonly w: number; readonly h: number } {
  const w = Math.round(Math.min(WIDEST, Math.max(STAGE_WIDTH / 4, STAGE_WIDTH * stageFactor())));
  return { w, h: Math.round((w * STAGE_HEIGHT) / STAGE_WIDTH) };
}

/**
 * A season card's oval (round R8a, D2): its scene light on ink (halftone.ts renderLightCanvas), drawn at 560×200 stage
 * pixels times the stage's factor, its dot cell 3.6 times the same; the oval shows the drawing's middle 400.
 */
export type LightJob = readonly [scene: SceneId, season: SeasonId, w: number, h: number, cell: number];
const OVAL = { w: 560, h: 200, cell: 3.6 } as const;
const lights = new Map<string, string>();
const lightKey = ([scene, season]: LightJob): string => `${scene}:${season}`;

/**
 * The awards night's backdrop (round R8c, C2 and C3): the major's scene light on ink, 1100×393 stage pixels times the
 * stage's factor, its dot cell 4.4 times the same; winter for all four (only the street draws by season). Its own cache,
 * by scene and size, kept for the page's life — PLAY AGAIN into the same major finds it; not the ovals' map, keyed by
 * scene and season (carpet in winter is also winter's oval, at another size).
 */
const BACKDROP = { w: 1100, h: 393, cell: 4.4 } as const;
const backdrops = new Map<string, string>();
const backdropKey = ([scene, , w, h]: LightJob): string => `${scene}:${w}x${h}`;

/** The backdrop's light job for a scene, at the stage's factor now. */
export function backdropJob(scene: SceneId): LightJob {
  const k = stageFactor();
  return [scene, 'winter', Math.round(BACKDROP.w * k), Math.round(BACKDROP.h * k), BACKDROP.cell * k] as const;
}

/** The backdrop if it is drawn already. */
export const backdropNow = (job: LightJob): string | null => backdrops.get(backdropKey(job)) ?? null;

/**
 * Draws the backdrop off the main thread: one light job for the photo worker, posted when the night mounts. Without a
 * worker (no Worker or OffscreenCanvas, or the worker fails), `onPage` decides when it is drawn on the page — when it is
 * idle, after the night's reveal. Resolves with its URL, cached.
 */
export function drawBackdrop(job: LightJob, onPage: (draw: () => void) => void): Promise<string> {
  const hit = backdropNow(job);
  if (hit) return Promise.resolve(hit);
  return new Promise<string>((resolve) => {
    // The first drawing kept; one that comes after it (another night's request) gives way to it.
    const keep = (url: string) => {
      const was = backdrops.get(backdropKey(job));
      if (was === undefined) backdrops.set(backdropKey(job), url);
      else if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      resolve(was ?? url);
    };
    let settled = false;
    const page = () => {
      if (settled) return;
      settled = true;
      onPage(() => keep(renderLightCanvas(...job, t('desk.photo.director'), false).toDataURL()));
    };
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      page();
      return;
    }
    try {
      const worker = new Worker(new URL('./photo-worker.ts', import.meta.url), { type: 'module' });
      const timer = window.setTimeout(() => fall(), 15000);
      const fall = () => {
        window.clearTimeout(timer);
        worker.terminate();
        page();
      };
      worker.onmessage = (event: MessageEvent<{ light?: LightJob; blob?: Blob; done?: boolean; error?: string }>) => {
        if (settled) return;
        const m = event.data;
        if (m.error) return fall();
        if (m.light && m.blob) {
          settled = true;
          window.clearTimeout(timer);
          worker.terminate();
          keep(URL.createObjectURL(m.blob));
        } else if (m.done) fall();
      };
      worker.onerror = (event) => {
        event.preventDefault();
        fall();
      };
      worker.onmessageerror = fall;
      worker.postMessage({ lights: [job], directorLabel: t('desk.photo.director') });
    } catch {
      page();
    }
  });
}

/** The season cards' ovals content asks for (rules.seasonScenes), at the stage's factor now. */
export function lightJobs(): LightJob[] {
  const k = stageFactor();
  return Object.entries(content.rules.seasonScenes ?? {}).map(([season, scene]) => [scene as SceneId, season as SeasonId, Math.round(OVAL.w * k), Math.round(OVAL.h * k), OVAL.cell * k] as const);
}
const ovalJob = (season: SeasonId): LightJob | undefined => lightJobs().find(([, s]) => s === season);

/** Who waits for an oval, by its key (round R8d, A3): the opening, for spring's. */
const waiting = new Map<string, ((url: string) => void)[]>();
/** Keeps an oval unless one is kept already (`url` is made only then), and hands it to whoever waits for it. */
function keepLight(job: LightJob, url: () => string): string {
  const key = lightKey(job);
  const was = lights.get(key);
  if (was !== undefined) return was;
  const kept = url();
  lights.set(key, kept);
  for (const resolve of waiting.get(key) ?? []) resolve(kept);
  waiting.delete(key);
  return kept;
}

/**
 * A season card's photograph, or null for a season content gives no scene. Drawn ahead by the warm-up and kept for
 * the page's life, as the title's is; drawn here, at once, only if the warm-up has not delivered it. The opening never
 * draws spring's: it looks it up (seasonPhotoNow) and waits for the warm-up (seasonPhotoDrawn).
 */
export function seasonPhotoUrl(season: SeasonId): string | null {
  const job = ovalJob(season);
  return job ? keepLight(job, () => renderLightCanvas(...job, t('desk.photo.director'), false).toDataURL()) : null;
}

/** Whether a season's card has an oval: content gives the season a scene. */
export const seasonHasPhoto = (season: SeasonId): boolean => ovalJob(season) !== undefined;

/** A season card's oval if it is drawn already (round R8d, A3): the opening looks spring's up, never draws it. */
export function seasonPhotoNow(season: SeasonId): string | null {
  const job = ovalJob(season);
  return job ? (lights.get(lightKey(job)) ?? null) : null;
}

/**
 * A season card's oval once the warm-up has drawn it (round R8d, A3) — at once if it is kept already; never drawn here.
 * Null for a season with none.
 */
export function seasonPhotoDrawn(season: SeasonId): Promise<string> | null {
  const job = ovalJob(season);
  if (!job) return null;
  const key = lightKey(job);
  const hit = lights.get(key);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => waiting.set(key, [...(waiting.get(key) ?? []), resolve]));
}

/**
 * The title's photograph (round R3, amended): drawn once, at the screen's pixel size, in the worker where there is
 * one (else on the page when it is idle), and kept for the page's life — PLAY AGAIN finds it ready. Requested as the
 * app starts (round R5, B8: ui/main.tsx), before the title mounts; the desk photos' warm-up waits for it.
 */
export function titlePhoto(): Promise<string> {
  return (title ??= new Promise<string>((resolve) => {
    const { w, h } = titleSize();
    const keep = (url: string) => {
      titleReady = url;
      resolve(url);
    };
    const draw = () => keep(renderTitleCanvas(w, h, false).toDataURL());
    const later = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(draw, { timeout: 500 });
      else setTimeout(draw, 40);
    };
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      later();
      return;
    }
    try {
      const worker = new Worker(new URL('./photo-worker.ts', import.meta.url), { type: 'module' });
      let settled = false;
      const fall = () => {
        if (settled) return;
        settled = true;
        worker.terminate();
        later();
      };
      worker.onmessage = (event: MessageEvent<{ blob?: Blob; error?: string }>) => {
        if (settled) return;
        if (!event.data.blob) {
          fall();
          return;
        }
        settled = true;
        worker.terminate();
        keep(URL.createObjectURL(event.data.blob));
      };
      worker.onerror = (event) => {
        event.preventDefault();
        fall();
      };
      worker.onmessageerror = fall;
      window.setTimeout(fall, 15000);
      worker.postMessage({ title: { w, h } });
    } catch {
      later();
    }
  }));
}
/** The title's photograph if it is drawn already: the title after PLAY AGAIN starts with it. */
export const titlePhotoNow = (): string | null => titleReady;

export interface PhotoWarmResult { readonly method:'worker'|'idle';readonly count:number;readonly reason?:string }
/** The worker's oval for a season card, kept unless one is shown already. */
function cacheLightBlob(job:LightJob,blob:Blob):void {
  keepLight(job,()=>URL.createObjectURL(blob));
}
let warming:Promise<PhotoWarmResult>|null=null;
export function photoJobs(variants:number):PhotoJob[] {
  const jobs:PhotoJob[]=[['headshot','spring',0]];
  for(const scene of SCENE_IDS)for(const season of scene==='street'?SEASON_IDS:['spring'] as const)
    for(let variant=0;variant<variants;variant++)jobs.push([scene,season,variant]);
  return jobs;
}

/**
 * The warm-up's work, in its order (round R8d, A3): spring's oval first — the opening comes right after BEGIN — then
 * the papers' photographs, then the other season cards' ovals (round R8a, D2): a card never waits for its photograph.
 */
export interface WarmJobs { readonly first:LightJob|null;readonly jobs:readonly PhotoJob[];readonly lights:readonly LightJob[] }
export function warmJobs(variants:number):WarmJobs {
  const ovals=lightJobs(),opening=content.rules.seasons?.[0],first=ovals.find(([,season])=>season===opening)??null;
  return {first,jobs:photoJobs(variants),lights:ovals.filter(oval=>oval!==first)};
}

/**
 * Keep PNG encoding off the presentation thread. Old browsers retain the same lazy/idle path, in the same order
 * (warmJobs).
 */
export function warmPhotos(variants:number):Promise<PhotoWarmResult> {
  return warming??=new Promise(resolve=>{
    const warm=warmJobs(variants),count=(warm.first?1:0)+warm.jobs.length+warm.lights.length;
    let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,fellBack=false;
    const cleanup=()=>{clearTimeout(timer);worker?.terminate();};
    const fallback=(reason:string)=>{
      if(fellBack)return;fellBack=true;cleanup();
      const pending:(()=>unknown)[]=[...(warm.first?[warm.first]:[]).map(oval=>()=>seasonPhotoUrl(oval[1])),...warm.jobs.map(job=>()=>photoUrl(...job)),...warm.lights.map(oval=>()=>seasonPhotoUrl(oval[1]))];
      const next=()=>{
        if(document.querySelector('[data-busy="1"]')){setTimeout(schedule,250);return;}
        pending.shift()?.();
        if(pending.length)schedule();else resolve({method:'idle',count,reason});
      };
      const schedule=()=>{
        if('requestIdleCallback' in window)window.requestIdleCallback(next,{timeout:2000});
        else setTimeout(next,40);
      };
      schedule();
    };
    if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'){fallback('Worker/OffscreenCanvas unavailable');return;}
    try {
      worker=new Worker(new URL('./photo-worker.ts',import.meta.url),{type:'module'});
      worker.onmessage=(event:MessageEvent<{job?:PhotoJob;light?:LightJob;blob?:Blob;done?:boolean;error?:string}>)=>{
        if(fellBack)return;
        const message=event.data;
        if(message.error){fallback(message.error);return;}
        if(message.job&&message.blob)cachePhotoBlob(message.job,message.blob);
        if(message.light&&message.blob)cacheLightBlob(message.light,message.blob);
        if(message.done){cleanup();resolve({method:'worker',count});}
      };
      worker.onerror=event=>{event.preventDefault();fallback(event.message);};
      worker.onmessageerror=()=>fallback('Photo worker message could not be decoded');
      timer=setTimeout(()=>fallback('Photo worker exceeded 15s preparation deadline'),15000);
      worker.postMessage({...warm,directorLabel:t('desk.photo.director')});
    } catch(error) {fallback(String(error));}
  });
}
