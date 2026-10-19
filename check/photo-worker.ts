import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {launch,browsersFromArgs} from './browser.ts';
import {ROOT} from './desk-replay.ts';
const server=await createServer({root:ROOT,logLevel:'error',server:{port:5198,strictPort:false}});
await server.listen();
try {
  for(const browser of browsersFromArgs(process.argv)){
    const page=await launch(browser,{width:1280,height:720});
    try {
      await page.navigate(server.resolvedUrls!.local[0]!);
      const result=await page.evaluate<{warm:{method:string;count:number;reason?:string};comparisons:{job:unknown;light:boolean;different:number;maxDelta:number}[];fallback:{method:string;count:number};blockedWhileBusy:boolean}>(`(async()=>{
        const preload=await import('/ui/desk/photo-preload.ts');
        const drawing=await import('/ui/desk/halftone.ts');
        const warm=await preload.warmPhotos(3);
        const label=(await import('/ui/i18n.ts')).t('desk.photo.director');
        const comparisons=[];
        if(warm.method==='worker')await new Promise((resolve,reject)=>{
          const worker=new Worker('/ui/desk/photo-worker.ts',{type:'module'}),pending=[];
          const timer=setTimeout(()=>{worker.terminate();reject(Error('photo pixel comparison deadline'))},30000);
          const finish=()=>{clearTimeout(timer);worker.terminate()};
          worker.onerror=e=>{finish();reject(Error(e.message))};
          worker.onmessage=event=>{
            const m=event.data;
            if(m.error){finish();reject(Error(m.error));return}
            // A paper's photograph against the page's own; a season card's oval (round R8a, D2) against renderLightCanvas.
            if((m.job||m.light)&&m.blob)pending.push((async()=>{
              const expected=m.job?drawing.photoCanvas(...m.job):drawing.renderLightCanvas(...m.light,label,false),g=expected.getContext('2d');
              const a=g.getImageData(0,0,expected.width,expected.height).data;
              const url=URL.createObjectURL(m.blob),img=new Image();
              try {
                await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url});
                g.clearRect(0,0,expected.width,expected.height);g.drawImage(img,0,0);
                const b=g.getImageData(0,0,expected.width,expected.height).data;
                let different=0,maxDelta=0;
                for(let i=0;i<a.length;i++)if(a[i]!==b[i]){different++;maxDelta=Math.max(maxDelta,Math.abs(a[i]-b[i]))}
                comparisons.push({job:m.job??m.light,light:!!m.light,different,maxDelta});
              }finally{URL.revokeObjectURL(url)}
            })());
            if(m.done)Promise.all(pending).then(()=>{finish();resolve(true)},e=>{finish();reject(e)});
          };
          worker.postMessage({jobs:preload.photoJobs(3),lights:preload.lightJobs(),directorLabel:label});
        });
        const OriginalWorker=window.Worker;
        let fallback,blockedWhileBusy;
        try {
          window.Worker=undefined;
          const other=await import('/ui/desk/photo-preload.ts?fallback-check');
          const busy=document.createElement('i');busy.dataset.busy='1';document.body.appendChild(busy);
          let done=false;const loading=other.warmPhotos(3).then(r=>{done=true;return r});
          await new Promise(r=>setTimeout(r,300));blockedWhileBusy=!done;busy.remove();
          fallback=await loading;
        }finally{window.Worker=OriginalWorker}
        return {warm,comparisons,fallback,blockedWhileBusy};
      })()`,45000);
      if(result.warm.method==='worker'){
        assert.equal(result.comparisons.length,result.warm.count);
        assert.deepEqual(result.comparisons.filter(c=>c.different),[],`${browser}: worker pixels differ from original canvas`);
        const ovals=result.comparisons.filter(c=>c.light).length;
        assert.ok(ovals>0,`${browser}: no season card's oval was compared`);
        console.log(`PASS photo worker ${browser}: ${result.comparisons.length-ovals} photos and ${ovals} season cards' ovals, exact RGBA parity`);
      }else {
        assert.equal(result.warm.reason,'Worker/OffscreenCanvas unavailable',`${browser}: unexpected worker failure is not a capability skip`);
        console.log(`SKIP worker pixels ${browser}: ${result.warm.reason}; original idle rendering retained`);
      }
      assert.equal(result.fallback.method,'idle');
      assert.equal(result.fallback.count,result.warm.count);
      assert.equal(result.blockedWhileBusy,true);
      console.log(`PASS photo fallback ${browser}: busy guard and complete finite cache`);
    }finally{await page.close();}
  }
}finally{await server.close();}
