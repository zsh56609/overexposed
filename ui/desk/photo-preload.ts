import { SCENE_IDS, SEASON_IDS } from '../../core/index.ts';
import { t } from '../i18n.ts';
import { cachePhotoBlob, photoUrl, renderTitleCanvas, type PhotoJob } from './halftone.ts';

let title: Promise<string> | null = null;
let titleReady: string | null = null;
/**
 * The title's photograph (round R3, amended): drawn once, at the screen's pixel size, in the worker where there is
 * one (else on the page when it is idle), and kept for the page's life — PLAY AGAIN finds it ready.
 */
export function titlePhoto(w: number, h: number): Promise<string> {
  return (title ??= new Promise<string>((resolve) => {
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
let warming:Promise<PhotoWarmResult>|null=null;
export function photoJobs(variants:number):PhotoJob[] {
  const jobs:PhotoJob[]=[['headshot','spring',0]];
  for(const scene of SCENE_IDS)for(const season of scene==='street'?SEASON_IDS:['spring'] as const)
    for(let variant=0;variant<variants;variant++)jobs.push([scene,season,variant]);
  return jobs;
}

/** Keep PNG encoding off the presentation thread. Old browsers retain the same lazy/idle path. */
export function warmPhotos(variants:number):Promise<PhotoWarmResult> {
  return warming??=new Promise(resolve=>{
    const jobs=photoJobs(variants);
    let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,fellBack=false;
    const cleanup=()=>{clearTimeout(timer);worker?.terminate();};
    const fallback=(reason:string)=>{
      if(fellBack)return;fellBack=true;cleanup();
      const pending=[...jobs];
      const next=()=>{
        if(document.querySelector('[data-busy="1"]')){setTimeout(schedule,250);return;}
        const job=pending.shift();if(job)photoUrl(...job);
        if(pending.length)schedule();else resolve({method:'idle',count:jobs.length,reason});
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
      worker.onmessage=(event:MessageEvent<{job?:PhotoJob;blob?:Blob;done?:boolean;error?:string}>)=>{
        if(fellBack)return;
        const message=event.data;
        if(message.error){fallback(message.error);return;}
        if(message.job&&message.blob)cachePhotoBlob(message.job,message.blob);
        if(message.done){cleanup();resolve({method:'worker',count:jobs.length});}
      };
      worker.onerror=event=>{event.preventDefault();fallback(event.message);};
      worker.onmessageerror=()=>fallback('Photo worker message could not be decoded');
      timer=setTimeout(()=>fallback('Photo worker exceeded 15s preparation deadline'),15000);
      worker.postMessage({jobs,directorLabel:t('desk.photo.director')});
    } catch(error) {fallback(String(error));}
  });
}
