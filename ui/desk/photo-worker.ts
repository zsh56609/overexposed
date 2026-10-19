import { renderLightCanvas, renderPhotoCanvas, renderTitleCanvas, type PhotoJob } from './halftone.ts';
import type { LightJob } from './photo-preload.ts';

// This worker owns only image preparation, never game state or presentation callbacks. It draws the papers'
// photographs in batches, then the season cards' ovals light on ink (round R8a, D2), or the title's photograph
// (round R3, amended) at the screen's pixel size.
globalThis.onmessage=async (event:MessageEvent<{jobs?:readonly PhotoJob[];lights?:readonly LightJob[];directorLabel?:string;title?:{readonly w:number;readonly h:number}}>)=>{
  try {
    const title=event.data.title;
    if(title) {
      globalThis.postMessage({title:true,blob:await renderTitleCanvas(title.w,title.h,true).convertToBlob({type:'image/png'})});
      return;
    }
    for(const job of event.data.jobs??[]) {
      const blob=await renderPhotoCanvas(...job,event.data.directorLabel??'',true).convertToBlob({type:'image/png'});
      globalThis.postMessage({job,blob});
    }
    for(const light of event.data.lights??[]) {
      const blob=await renderLightCanvas(...light,event.data.directorLabel??'',true).convertToBlob({type:'image/png'});
      globalThis.postMessage({light,blob});
    }
    globalThis.postMessage({done:true});
  } catch(error) {
    globalThis.postMessage({error:String(error)});
  }
};
