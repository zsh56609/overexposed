// Select the longest real quiet play in the fixed replay corpus; never patch prose or game state.
import { createInitialState, reduce, pressLines, type Action, type Content, type GameState } from '../core/index.ts';
import { loadRawContent } from '../validate/load.ts';
import { loadStates, type DeskState, type Step } from '../check/desk-replay.ts';
import type { PlayedStep } from '../ui/queue.ts';
import { lineText } from '../ui/text.ts';
export function longestQuietPlay() {
 const content=loadRawContent() as Content;
 const actionFor=(s:GameState,[kind,i]:Step):Action=>{
  switch(kind){
   case 'manager':return {type:'CHOOSE_MANAGER',managerId:content.managers!.managers[i]!.id};
   case 'draft':return {type:'DRAFT_PICK',cardId:s.draft!.offer[i]!};
   case 'extra':return {type:'DRAFT_EXTRA_PICK'};
   case 'reroll':return {type:'DRAFT_REROLL'};
   case 'gate':return {type:'CHOOSE_GATE',gateId:s.gateOffer[i]!};
   case 'play':return {type:'PLAY_CARD',uid:s.hand[i]!.uid};
   case 'end':return {type:'END_TURN'};
  }
 };
 let best:{fixture:DeskState;selector:string;text:string;writingMs:number;key:string|null;corpus:string}|undefined;
 for(const [corpus,fixture] of Object.entries(loadStates())){
  let state=createInitialState(fixture.seed,content,{strict:true});
  const history:PlayedStep[]=[{id:1,action:null,before:null,after:state,events:state.events}];
  fixture.steps.forEach((spec,index)=>{
   const action=actionFor(state,spec),after=reduce(state,action);
   history.push({id:history.length+1,action,before:state,after,events:after.events});
   if(action.type==='PLAY_CARD'){
    const line=pressLines(history).find(l=>l.step===history.length-1&&l.kind==='play'&&l.paper===null);
    if(line){
     const text=lineText(after.content,line,line.cardId,line.subjectKey);
     const writingMs=220+text.split(/\s+/).reduce((n,w)=>n+Math.max(90,w.length*40)+40,0);
     if(!best||writingMs>best.writingMs)best={fixture:{...fixture,steps:fixture.steps.slice(0,index)},selector:`.hand .card[data-uid="${action.uid}"]`,text,writingMs,key:line.key,corpus};
    }
   }
   state=after;
  });
 }
 if(!best)throw Error('No recorded quiet play');return best;
}
