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

/** The season cards' ovals content asks for (rules.seasonScenes), at the stage's factor now. */
export function lightJobs(): LightJob[] {
  const k = stageFactor();
  return Object.entries(content.rules.seasonScenes ?? {}).map(([season, scene]) => [scene as SceneId, season as SeasonId, Math.round(OVAL.w * k), Math.round(OVAL.h * k), OVAL.cell * k] as const);
}

/**
 * A season card's photograph, or null for a season with none (spring's card is the opening). Drawn ahead by the
 * warm-up and kept for the page's life, as the title's is; drawn here, at once, only if the warm-up has not delivered it.
 */
export function seasonPhotoUrl(season: SeasonId): string | null {
  const job = lightJobs().find(([, s]) => s === season);
  if (!job) return null;
  const hit = lights.get(lightKey(job));
  if (hit) return hit;
  const url = renderLightCanvas(...job, t('desk.photo.director'), false).toDataURL();
  lights.set(lightKey(job), url);
  return url;
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
  const key=lightKey(job);if(!lights.has(key))lights.set(key,URL.createObjectURL(blob));
}
let warming:Promise<PhotoWarmResult>|null=null;
export function photoJobs(variants:number):PhotoJob[] {
  const jobs:PhotoJob[]=[['headshot','spring',0]];
  for(const scene of SCENE_IDS)for(const season of scene==='street'?SEASON_IDS:['spring'] as const)
    for(let variant=0;variant<variants;variant++)jobs.push([scene,season,variant]);
  return jobs;
}

/**
 * Keep PNG encoding off the presentation thread. Old browsers retain the same lazy/idle path. The papers' photographs
 * first, then the season cards' ovals (round R8a, D2): a card never waits for its photograph.
 */
export function warmPhotos(variants:number):Promise<PhotoWarmResult> {
  return warming??=new Promise(resolve=>{
    const jobs=photoJobs(variants),ovals=lightJobs(),count=jobs.length+ovals.length;
    let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,fellBack=false;
    const cleanup=()=>{clearTimeout(timer);worker?.terminate();};
    const fallback=(reason:string)=>{
      if(fellBack)return;fellBack=true;cleanup();
      const pending=[...jobs],pendingOvals=[...ovals];
      const next=()=>{
        if(document.querySelector('[data-busy="1"]')){setTimeout(schedule,250);return;}
        const job=pending.shift();if(job)photoUrl(...job);
        else{const oval=pendingOvals.shift();if(oval)seasonPhotoUrl(oval[1]);}
        if(pending.length||pendingOvals.length)schedule();else resolve({method:'idle',count,reason});
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
      worker.postMessage({jobs,lights:ovals,directorLabel:t('desk.photo.director')});
    } catch(error) {fallback(String(error));}
  });
}
