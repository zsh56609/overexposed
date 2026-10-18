import { createServer } from 'vite';
import { launch, browsersFromArgs, sizesFromArgs } from './browser.ts';
import { badKeyframes, ROOT } from './desk-replay.ts';
import { checkD7 } from './motion.ts';
import { checkPreviewInput } from './preview-input.ts';
import { checkBoundaryInput, checkMonthEntry, checkMonthInput, checkOsMotion, checkPileInput } from './month-input.ts';
import { mkdirSync,writeFileSync } from 'node:fs';
const server=await createServer({root:ROOT,logLevel:'error',server:{port:5197,strictPort:false}});await server.listen();
try {
 for(const browser of browsersFromArgs(process.argv)) for(const size of sizesFromArgs(process.argv)) {
  const page=await launch(browser,size);
  const diagnosticFile=`check/out/motion-${browser}-${size.width}-${Date.now()}-diagnostics.json`;
  try {
    const url=server.resolvedUrls!.local[0]!;
    if(process.argv.includes('--entry-only'))await checkMonthEntry(page,url);
    else if(process.argv.includes('--coverage-only')){await checkPileInput(page,url);await checkMonthInput(page,url);}
    else if(process.argv.includes('--os-only'))await checkOsMotion(page,url);
    else if(process.argv.includes('--pile-only'))await checkPileInput(page,url);
    else if(process.argv.includes('--boundaries-only'))await checkBoundaryInput(page,url);
    else {if(!process.argv.includes('--month-only')){await checkMonthEntry(page,url);await checkD7(page,url);await checkPreviewInput(page,url);await checkPileInput(page,url);await checkBoundaryInput(page,url);await checkOsMotion(page,url);}await checkMonthInput(page,url);}
    // Every keyframe the runs animated, CSS-valid (round R5, B3): one CSS rejects is dropped without a word.
    const rejected=await badKeyframes(page);
    if(rejected.length)throw Error(`${rejected.length} keyframe value(s) CSS rejects, first: ${rejected.slice(0,3).map(b=>`${b.element} ${b.property}: ${b.value}`).join('; ')}`);
    mkdirSync('check/out',{recursive:true});writeFileSync(diagnosticFile,JSON.stringify(page.diagnostics,null,2));
    const candidates=page.diagnostics.filter(line=>line.startsWith('pageerror:')||line.startsWith('error:')||line.includes('Runtime.exceptionThrown')||/"type":"error"|"level":"error"/.test(line));
    const favicon=candidates.filter(line=>line.includes('/favicon.ico')&&line.includes('404'));
    if(favicon.length)console.log(`Known diagnostic: ${favicon.length} optional favicon 404; preserved in ${diagnosticFile}`);
    const errors=candidates.filter(line=>!favicon.includes(line));
    if(errors.length)throw Error(`${errors.length} browser errors; preserved in ${diagnosticFile}; first: ${errors[0]?.slice(0,700)}`);
    console.log(`PASS motion input ${browser} ${size.width}x${size.height}`);
  }
  catch(error) {
    let last:unknown='browser unavailable';
    try {last=await page.evaluate(`({url:location.href,step:document.querySelector('.desk,[data-presentation]')?.dataset.step,busy:document.querySelector('.desk,[data-presentation]')?.dataset.busy,beat:document.querySelector('.desk,[data-presentation]')?.dataset.beat})`,5000);}catch{}
    mkdirSync('check/out',{recursive:true});
    writeFileSync(diagnosticFile,JSON.stringify({error:String(error),last,diagnostics:page.diagnostics},null,2));
    console.error(`Motion failure: ${JSON.stringify(last)}; full browser diagnostics: ${diagnosticFile}`);
    throw error;
  }
  finally {await page.close();}
 }
} finally {await server.close();}
