// Read-only renderer diagnosis; these short idle samples are not motion acceptance.
import { preview } from 'vite';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { launch, browsersFromArgs } from '../check/browser.ts';
import { ROOT, loadStates, reach, centre } from '../check/desk-replay.ts';

const server=await preview({root:ROOT,base:'/itch-preview/',logLevel:'error',preview:{port:4178,strictPort:false}});
const url=server.resolvedUrls!.local[0]!,rows:unknown[]=[];
const name=process.argv.find(a=>a.startsWith('--name='))?.slice(7)??`render-environment-${new Date().toISOString().slice(0,10)}`;
const sample=`new Promise(resolve=>{
  const samples=[];let first=null,last=null;
  const tick=t=>{first??=t;if(last!==null)samples.push(t-last);last=t;
    if(t-first<3000)return requestAnimationFrame(tick);
    samples.sort((a,b)=>a-b);resolve({frames:samples.length,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1)});
  };requestAnimationFrame(tick);
})`;
try {
  for(const browser of browsersFromArgs(process.argv)){
    const page=await launch(browser,{width:1280,height:720});
    try {
      const startedAt=new Date().toISOString();
      await page.navigate('about:blank',100);
      const blank=await page.evaluate(sample,6000);
      const renderer=await page.evaluate(`(()=>{
        const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl');
        if(!gl)return {webgl:false};const ext=gl.getExtension('WEBGL_debug_renderer_info');
        return {webgl:true,vendor:gl.getParameter(ext?ext.UNMASKED_VENDOR_WEBGL:gl.VENDOR),renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER)};
      })()`);
      let graphicsSupport:unknown=null;
      if(browser==='firefox'){
        await page.navigate('about:support',1000);
        graphicsSupport=await page.evaluate(`({features:[...document.querySelectorAll('#graphics-features-tbody tr')].filter(tr=>/Compositing|Window Device Pixel Ratios/.test(tr.innerText)).map(tr=>tr.innerText),decisions:document.getElementById('graphics-decisions-tbody')?.innerText??'Graphics decisions unavailable'})`,5000);
      }
      await page.navigate(url,500);
      const title=await page.evaluate(sample,6000);
      if(await reach(page,url,loadStates().s02!)!=='ok')throw Error('Cannot reach renderer diagnostic desk');
      const off=await page.evaluate(sample,6000);
      await page.evaluate(`document.documentElement.dataset.motion='full'`);
      const fullIdle=await page.evaluate(sample,6000);
      // Stopping this existing control is a diagnostic comparison, not a faster full-motion pass.
      const metro=await centre(page,'.metro');
      if(!metro)throw Error('Missing metronome diagnostic control');
      await page.click(...metro);
      await page.evaluate('new Promise(r=>setTimeout(r,3000))',5000);
      const metronomeStopped=await page.evaluate(sample,6000);
      const assets=await page.evaluate<{photos:number;blobs:number;worker:string[];failed:string[];outsidePrefix:string[];optionalFavicon:string[]}>(`(async()=>{
        const photos=[...document.querySelectorAll('.pp .ph')].map(el=>el.style.backgroundImage.slice(5,-2));
        const failed=[];
        for(const src of photos){const img=new Image();try{await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=src});if(!img.naturalWidth)failed.push(src)}catch{failed.push(src)}}
        const resources=performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.startsWith(location.origin));
        const worker=resources.filter(n=>n.includes('/photo-worker-'));
        const optionalFavicon=resources.filter(n=>new URL(n).pathname==='/favicon.ico');
        return {photos:photos.length,blobs:photos.filter(n=>n.startsWith('blob:')).length,worker,failed,optionalFavicon,outsidePrefix:resources.filter(n=>!new URL(n).pathname.startsWith('/itch-preview/')&&!optionalFavicon.includes(n))};
      })()`,10000);
      const row={browser,startedAt,finishedAt:new Date().toISOString(),renderer,graphicsSupport,blank,title,off,fullIdle,metronomeStopped,assets,diagnostics:page.diagnostics.filter(x=>x.startsWith('pageerror:')||x.startsWith('error:'))};
      rows.push(row);console.log(JSON.stringify(row));
      writeFileSync(`docs/handoff/v1b-compare/${name}.json`,JSON.stringify({purpose:'Renderer capability and idle-only diagnosis, not active-motion acceptance',rows},null,2)+'\n');
      assert.ok(assets.photos>0);assert.deepEqual(assets.failed,[]);assert.deepEqual(assets.outsidePrefix,[]);
      if(browser!=='webkit'){assert.equal(assets.worker.length,1);assert.ok(assets.blobs>0,'Production worker must populate the displayed photo cache');}
    }finally{await page.close();}
  }
}finally{await new Promise<void>(r=>server.httpServer.close(()=>r()));}
