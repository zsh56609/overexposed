import { createServer } from 'vite';
import { launch, browsersFromArgs, sizesFromArgs } from './browser.ts';
import { ROOT } from './desk-replay.ts';
import { checkD7 } from './motion.ts';
import { checkPreviewInput } from './preview-input.ts';
import { checkBoundaryInput, checkMonthInput, checkPileInput } from './month-input.ts';
import { mkdirSync,writeFileSync } from 'node:fs';
const server=await createServer({root:ROOT,logLevel:'error',server:{port:5197,strictPort:false}});await server.listen();
try {
 for(const browser of browsersFromArgs(process.argv)) for(const size of sizesFromArgs(process.argv)) {
  const page=await launch(browser,size);
  try {
    const url=server.resolvedUrls!.local[0]!;
    if(process.argv.includes('--pile-only'))await checkPileInput(page,url);
    else if(process.argv.includes('--boundaries-only'))await checkBoundaryInput(page,url);
    else {if(!process.argv.includes('--month-only')){await checkD7(page,url);await checkPreviewInput(page,url);await checkPileInput(page,url);await checkBoundaryInput(page,url);}await checkMonthInput(page,url);}
    const diagnosticFile=`check/out/motion-${browser}-${size.width}-${Date.now()}-diagnostics.json`;
    mkdirSync('check/out',{recursive:true});writeFileSync(diagnosticFile,JSON.stringify(page.diagnostics,null,2));
    const candidates=page.diagnostics.filter(line=>line.startsWith('pageerror:')||line.startsWith('error:')||line.includes('Runtime.exceptionThrown')||/"type":"error"|"level":"error"/.test(line));
    const favicon=candidates.filter(line=>line.includes('/favicon.ico')&&line.includes('404'));
    if(favicon.length)console.log(`Known diagnostic: ${favicon.length} optional favicon 404; preserved in ${diagnosticFile}`);
    const errors=candidates.filter(line=>!favicon.includes(line));
    if(errors.length)throw Error(`${errors.length} browser errors; preserved in ${diagnosticFile}; first: ${errors[0]?.slice(0,700)}`);
    console.log(`PASS motion input ${browser} ${size.width}x${size.height}`);
  }
  finally {await page.close();}
 }
} finally {await server.close();}
