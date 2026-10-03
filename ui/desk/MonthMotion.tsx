import { useLayoutEffect, useMemo, useRef } from 'react';
import { establishedLanes, getCard, pressLines, readLines } from '../../core/index.ts';
import type { Snapshot } from '../queue.ts';
import { t } from '../i18n.ts';
import { calendarLabel, lineText, mastheadName, seasonName, seasonOpener, signedAmount } from '../text.ts';
import { CardPicture } from './Hand.tsx';
import { cardModel, type DeskModel } from './model.ts';
import { PILE_SLOTS, planeFace } from './Pile.tsx';

/** One reducer result, many presentation beats; removing this component cancels every effect. */
export function MonthMotion({snap,model}:{snap:Snapshot;model:DeskModel}) {
  const active=snap.active!;
  const {step,plan,mode}=active;
  const host=useRef<HTMLDivElement>(null);
  const cleanups=useRef<(()=>void)[]>([]);
  const rolls=useRef(new Map<string,()=>void>());
  const last=useRef(-1);
  const cards=useMemo(()=>{
    const history=snap.steps.filter(s=>s.id!==step.id);
    const lines={...readLines([...history,step]),lane:establishedLanes(history).at(-1)??null};
    const printed=pressLines([...history,step]);
    return step.events.flatMap((e,event)=>{
      if(e.type!=='addCard'||getCard(step.after.content,e.cardId)?.kind!=='scandal')return [];
      const line=printed.find(l=>l.step===history.length&&l.event===event&&l.uid===e.uid);
      if(!line) throw new Error(`Missing canonical scandal line ${step.id}:${event}:${e.uid}`);
      // Newly added discard cards have not had a draw. Show an approved in-hand variant from a
      // disposable counter fork, without consuming a real showing or inventing a draw event.
      const inHand=new Map(lines.inHand);if(!inHand.has(e.uid))inHand.set(e.uid,lines.counter.fork().inHand(e.cardId));
      return [{uid:e.uid,card:cardModel(step.after,e,{...lines,inHand}),story:`${line.step}:${line.event}`,paper:line.paper,
        title:lineText(step.after.content,line,e.cardId,line.subjectKey),masthead:line.paper?mastheadName(step.after.content,line.paper):''}];
    });
  },[step]);
  const elapsed=plan!.beats.slice(0,(active.index??0)+1);
  const season=elapsed.some(b=>b.kind==='season')&&!elapsed.some(b=>b.kind==='seasonEnd');
  useLayoutEffect(()=>()=>{for(const stop of cleanups.current.splice(0))stop();for(const stop of rolls.current.values())stop();rolls.current.clear();},[]);
  useLayoutEffect(()=>{
    const root=host.current?.closest<HTMLElement>('.desk'); if(!root||!host.current)return;
    const reduced=mode!=='full';
    const animate=(el:Element|null,frames:Keyframe[],duration:number,delay=0,fill:FillMode='none')=>{
      if(!el)return;
      const a=el.animate(reduced?[{opacity:.35},{opacity:1}]:frames,{duration:reduced?150:duration,delay:reduced?0:delay,fill,easing:'ease-out'});
      cleanups.current.push(()=>a.cancel());
    };
    for(let index=last.current+1;index<=(active.index??0);index++) {
      const beat=plan!.beats[index]!;
      if(beat.kind==='endPress') {
        animate(root.querySelector('.endbtn'),[{transform:'translateY(0)'},{transform:'translateY(4px)',offset:.4},{transform:'translateY(0)'}],260);
        root.querySelectorAll<HTMLElement>('.hand .card').forEach((c,i)=>{
          const own=getComputedStyle(c).transform;
          if(reduced) {const a=c.animate([{opacity:1},{opacity:0}],{duration:150,fill:'forwards'});cleanups.current.push(()=>a.cancel());}
          else animate(c,[{transform:own,opacity:1},{transform:`translateY(360px) ${own}`,opacity:0}],500,i*70,'forwards');
        });
      }
      if(beat.kind==='stamp') {
        const paper=root.querySelector('.pp.pos0');
        if(paper) {
          const stamp=document.createElement('div');stamp.className='month-stamp';stamp.textContent=t('ui.motion.printed');paper.appendChild(stamp);
          animate(stamp,[{opacity:0,transform:'rotate(-12deg) scale(2.2)'},{opacity:.9,transform:'rotate(-12deg) scale(1)'}],280);
          cleanups.current.push(()=>stamp.remove());
        }
      }
      if(beat.kind==='scandalLift') {
        const card=cards.find(c=>c.uid===beat.uid)!;
        const el=host.current.querySelector<HTMLElement>(`[data-flip="${beat.uid}"]`);
        const source=root.querySelector(`[data-story="${card.story}"]`)??root.querySelector(`[data-paper="${card.paper}"]`);
        if(el&&source&&!reduced) {
          const r=source.getBoundingClientRect(),desk=root.getBoundingClientRect(),scale=1280/desk.width;
          animate(el,[{opacity:0,transform:`translate(${(r.x+r.width/2-desk.x)*scale-parseFloat(el.style.left)-93}px,${(r.y-desk.y)*scale-318}px) rotate(-4deg) scale(.42)`},{opacity:1,transform:'none'}],500);
        } else animate(el,[{opacity:0},{opacity:1}],150);
      }
      if(beat.kind==='scandalFlip'&&reduced) animate(host.current.querySelector(`[data-flip="${beat.uid}"]`),[],150);
      if(beat.kind==='scandalCarry') {
        const i=cards.findIndex(c=>c.uid===beat.uid),cx=cards.length===1?640:640+(i-(cards.length-1)/2)*Math.min(224,650/Math.max(1,cards.length-1));
        const pile=root.querySelectorAll('.motion-pile .plane').length;
        const [x,y,rot]=PILE_SLOTS[Math.min(pile+i,PILE_SLOTS.length-1)]!;
        const plane=host.current.querySelector<HTMLElement>(`[data-scandal-plane="${beat.uid}"]`);
        if(plane) {
          if(!reduced) {
            animate(plane,[{transform:'rotateX(0deg)'},{transform:'rotateX(58deg)',offset:460/620},{transform:'rotateX(64deg)'}],620);
            animate(plane.firstElementChild,[{transform:planeFace(cx,318,i%2?3:-3,1)},{transform:planeFace(x,y-4,rot,.57),offset:460/620},{transform:planeFace(x,y,rot)}],620);
          } else animate(plane,[],150);
        }
      }
      if(beat.kind==='impact'&&!reduced) animate(root,[{transform:'translate(0)'},{transform:'translate(3px,2px)',offset:.2},{transform:'translate(-2px,-1px)',offset:.4},{transform:'translate(1px,1px)',offset:.65},{transform:'translate(0)'}],400);
      if(beat.kind==='sweep') root.querySelectorAll<HTMLElement>('.motion-pile .plane,[data-scandal-plane]').forEach((plane,i)=>{
        const face=plane.firstElementChild;
        if(reduced) {const a=plane.animate([{opacity:1},{opacity:0}],{duration:150,fill:'forwards'});cleanups.current.push(()=>a.cancel());}
        else if(face){ const own=getComputedStyle(face).transform;animate(face,[{transform:own,opacity:1},{transform:`translate(260px,20px) ${own}`,opacity:0}],550,i*80,'forwards'); }
      });
      if(beat.kind==='date') animate(root.querySelector('[data-hook="date"]'),[{transform:'rotateX(0)'},{transform:'rotateX(90deg)',offset:.5},{transform:'rotateX(0)'}],520);
      if(beat.kind==='season') animate(host.current.querySelector('.month-season'),[{opacity:0},{opacity:1}],300);
      if(beat.kind==='publish') root.querySelectorAll('.pp').forEach(p=>animate(p,[{opacity:0},{opacity:1}],800));
      if(beat.kind==='deal') {
        const card=root.querySelector<HTMLElement>(`.hand .card[data-uid="${beat.uid}"]`);
        if(card)animate(card,[{transform:'translateY(360px)'},{transform:getComputedStyle(card).transform}],450);
      }
      if(beat.kind==='message') {
        const bubble=root.querySelectorAll('.bub[data-k]')[beat.bubble!];
        animate(bubble??null,[{opacity:0,transform:'translateY(14px) scale(.8)'},{opacity:1,transform:'none'}],450);
        if(beat.bubble!%2===0) {
          const phone=root.querySelector('.phone');
          if(phone){const own=getComputedStyle(phone).transform;animate(phone,[{transform:own,filter:'brightness(1)'},{transform:`${own} translateX(3px)`,filter:'brightness(1.6)',offset:.2},{transform:`${own} translateX(-2px)`,offset:.4},{transform:own,filter:'brightness(1)'}],450);}
        }
      }
      for(const e of beat.resourceEvents??[]) {
        const id=e.target==='capital'?'money':e.target;
        const value=root.querySelector<HTMLElement>(`[data-hook="${id==='money'?'value':'number'}-${id}"]`);if(!value)continue;
        rolls.current.get(id)?.();
        if(!reduced){
          let frame=0;const start=performance.now();
          const roll=()=>{const t=Math.min(1,(performance.now()-start)/560),n=Math.round(e.value-e.delta*(1-t)**3);value.textContent=id==='money'?`£${(n*1000).toLocaleString('en-GB')}`:String(n);if(t<1)frame=requestAnimationFrame(roll);else value.textContent=value.dataset.final??value.textContent;};
          frame=requestAnimationFrame(roll);rolls.current.set(id,()=>{cancelAnimationFrame(frame);value.textContent=value.dataset.final??value.textContent;});
        }
        const delta=document.createElement('span');delta.className=`motion-delta delta-${id}`;delta.textContent=signedAmount(e.target,e.delta);
        const r=value.getBoundingClientRect(),d=root.getBoundingClientRect();delta.style.left=`${(r.x+r.width/2-d.x)*1280/d.width}px`;host.current.appendChild(delta);
        animate(delta,[{opacity:0},{opacity:1,offset:.12},{opacity:0}],1350,0,'forwards');cleanups.current.push(()=>delta.remove());
        animate(value,[{color:'var(--motion-tint)'},{color:'inherit'}],820);
      }
    }
    last.current=active.index??0;
  },[active, cards, mode, plan]);
  return <div ref={host} className="month-motion" aria-hidden="true">
    {cards.map((item,i)=>{
      const stage=elapsed.filter(b=>b.uid===item.uid).at(-1)?.kind;
      const lifted=stage==='scandalLift'||stage==='scandalFlip',carried=stage==='scandalCarry'||stage==='impact';
      const cx=cards.length===1?640:640+(i-(cards.length-1)/2)*Math.min(224,650/Math.max(1,cards.length-1));
      const count=snap.steps.flatMap(s=>s.before?.turn===step.before?.turn?s.events.filter(e=>e.type==='play'):[]).length;
      const [x,y,rot]=PILE_SLOTS[Math.min(count+i,PILE_SLOTS.length-1)]!;
      return <div key={item.uid}>
        <div data-flip={item.uid} className={`month-flip motion-face${stage==='scandalFlip'?' turned':''}${mode==='reduced'?' reduced':''}`} style={{left:cx-93,visibility:lifted?'visible':'hidden'}}>
          <div className="month-flip-inner"><div className="month-headline"><small>{item.masthead}</small><b>{item.title}</b></div><div className="month-back"><CardPicture card={item.card} words={model.handWords} season={model.season}/></div></div>
        </div>
        <div className="scene3d month-carried motion-face" style={{visibility:carried?'visible':'hidden'}}><div className="plane" data-scandal-plane={item.uid} style={{transform:'rotateX(64deg)'}}><div style={{position:'absolute',transform:planeFace(x,y,rot)}}><CardPicture card={item.card} words={model.handWords} season={model.season}/></div></div></div>
      </div>;
    })}
    {season&&<div className="month-season"><small>{calendarLabel(step.after.content,step.after.turn)}</small><h2>{seasonName(step.after.content,step.after.act)}</h2><p>{seasonOpener(step.after.content,step.after.seed,step.after.act)}</p></div>}
  </div>;
}
