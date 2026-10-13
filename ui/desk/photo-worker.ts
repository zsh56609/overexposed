import { renderPhotoCanvas, type PhotoJob } from './halftone.ts';

// This worker owns only image preparation, never game state or presentation callbacks.
globalThis.onmessage=async (event:MessageEvent<{jobs:readonly PhotoJob[];directorLabel:string}>)=>{
  try {
    for(const job of event.data.jobs) {
      const blob=await renderPhotoCanvas(...job,event.data.directorLabel,true).convertToBlob({type:'image/png'});
      globalThis.postMessage({job,blob});
    }
    globalThis.postMessage({done:true});
  } catch(error) {
    globalThis.postMessage({error:String(error)});
  }
};
