// Read an existing Chromium CPU profile and Vite source map. No dependency or production instrumentation.
import { readFileSync, writeFileSync } from 'node:fs';
type Frame={functionName:string;url:string;lineNumber:number;columnNumber:number};
type Node={id:number;callFrame:Frame;children?:number[]};
const [profileFile,mapFile,outFile]=process.argv.slice(2);
if(!profileFile||!mapFile||!outFile)throw Error('profile-summary <profile.cpuprofile> <bundle.js.map> <summary.json>');
const profile=JSON.parse(readFileSync(profileFile,'utf8')) as {nodes:Node[];samples:number[];timeDeltas:number[]};
const map=JSON.parse(readFileSync(mapFile,'utf8')) as {sources:string[];names:string[];mappings:string};
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decode(segment:string){
 const values:number[]=[];let value=0,shift=0;
 for(const char of segment){const digit=alphabet.indexOf(char);if(digit<0)throw Error('invalid source map');value+=(digit&31)*2**shift;if(digit&32)shift+=5;else{values.push(value&1?-(value>>1):value>>1);value=0;shift=0;}}
 return values;
}
let source=0,line=0,column=0,name=0;
const mappings=map.mappings.split(';').map(row=>{
 let generated=0;return row.split(',').filter(Boolean).flatMap(segment=>{
  const fields=decode(segment);generated+=fields[0]!;if(fields.length<4)return [];
  source+=fields[1]!;line+=fields[2]!;column+=fields[3]!;if(fields.length>4)name+=fields[4]!;
  return [{generated,source,line,column,name:fields.length>4?name:null}];
 });
});
const locate=(frame:Frame)=>{
 if(!frame.url.includes('/assets/'))return {function:frame.functionName||'(anonymous)',source:frame.url||'(browser)',line:frame.lineNumber+1};
 const segment=mappings[frame.lineNumber]?.filter(s=>s.generated<=frame.columnNumber).slice(-1)[0];
 return {function:frame.functionName||(segment?.name!=null?map.names[segment.name]:'(anonymous)'),source:segment?map.sources[segment.source]:frame.url,line:segment?segment.line+1:frame.lineNumber+1};
};
const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map<number,number>();
for(const node of profile.nodes)for(const child of node.children??[])parents.set(child,node.id);
const self=new Map<number,number>(),inclusive=new Map<number,number>();
profile.samples.forEach((id,i)=>{
 const ms=(profile.timeDeltas[i]??0)/1000;self.set(id,(self.get(id)??0)+ms);
 for(let at:number|undefined=id;at!==undefined;at=parents.get(at))inclusive.set(at,(inclusive.get(at)??0)+ms);
});
const top=(times:Map<number,number>)=>[...times].sort((a,b)=>b[1]-a[1]).slice(0,35).map(([id,ms])=>({...locate(nodes.get(id)!.callFrame),sampledMs:Math.round(ms*100)/100}));
writeFileSync(outFile,JSON.stringify({profileFile,mapFile,samples:profile.samples.length,totalSampledMs:profile.timeDeltas.reduce((a,b)=>a+b,0)/1000,self:top(self),inclusive:top(inclusive)},null,2)+'\n');
console.log(outFile);
