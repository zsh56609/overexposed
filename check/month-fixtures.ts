// Find qualifying states from the fixed corpus by actual reducer events, never by invented state.
import { createInitialState, getCard, reduce, type Action, type Content, type GameState } from '../core/index.ts';
import { loadRawContent } from '../validate/load.ts';
import { loadStates, type DeskState, type Step } from './desk-replay.ts';
const content=loadRawContent() as Content;
function actionFor(s:GameState,[kind,i]:Step):Action {
  switch(kind){
    case 'manager':return {type:'CHOOSE_MANAGER',managerId:content.managers!.managers[i]!.id};
    case 'draft':return {type:'DRAFT_PICK',cardId:s.draft!.offer[i]!};
    case 'extra':return {type:'DRAFT_EXTRA_PICK'};
    case 'reroll':return {type:'DRAFT_REROLL'};
    case 'gate':return {type:'CHOOSE_GATE',gateId:s.gateOffer[i]!};
    case 'play':return {type:'PLAY_CARD',uid:s.hand[i]!.uid};
    case 'end':return {type:'END_TURN'};
  }
}
export function qualifyingMonths():{single:DeskState;relief:DeskState} {
  let single:DeskState|undefined,relief:DeskState|undefined;
  for(const fixture of Object.values(loadStates())){
    let state=createInitialState(fixture.seed,content,{strict:true});
    for(let i=0;i<fixture.steps.length;i++){
      const action=actionFor(state,fixture.steps[i]!),after=reduce(state,action);
      if(action.type==='END_TURN'){
        const before={...fixture,steps:fixture.steps.slice(0,i),hand:state.hand.map(c=>c.cardId)};
        const added=after.events.filter(e=>e.type==='addCard'&&getCard(after.content,e.cardId)?.kind==='scandal');
        if(added.length===1&&!single)single=before;
        const endIndex=after.events.findIndex(e=>e.type==='turnEnd');
        if(after.manager==='guardian'&&after.events.some((e,j)=>j>endIndex&&e.type==='resource'&&e.target==='heat'&&e.delta<0)&&!relief)relief=before;
      }
      if(single&&relief)return {single,relief};
      state=after;
    }
  }
  throw Error('Fixed corpus must contain one-scandal and qualifying Mags-relief months');
}
