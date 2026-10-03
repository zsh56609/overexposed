import { createServer } from 'vite';
import { launch, browsersFromArgs, sizesFromArgs } from './browser.ts';
import { ROOT } from './desk-replay.ts';
import { checkD7 } from './motion.ts';
import { checkPreviewInput } from './preview-input.ts';
const server=await createServer({root:ROOT,logLevel:'error',server:{port:5197,strictPort:false}});await server.listen();
try {
 for(const browser of browsersFromArgs(process.argv)) for(const size of sizesFromArgs(process.argv)) {
  const page=await launch(browser,size);
  try { await checkD7(page,server.resolvedUrls!.local[0]!); await checkPreviewInput(page,server.resolvedUrls!.local[0]!);console.log(`PASS motion input ${browser} ${size.width}x${size.height}`); }
  finally {await page.close();}
 }
} finally {await server.close();}
