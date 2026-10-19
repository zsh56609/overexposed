// Find qualifying states from the fixed corpus by actual reducer events, never by invented state.
import { createInitialState, establishedLanes, getCard, readLines, reduce, type Action, type Content, type GameState } from '../core/index.ts';
import { deskModel } from '../ui/desk/model.ts';
import type { PlayedStep } from '../ui/queue.ts';
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
    case 'event':return {type:'CHOOSE_EVENT',choice:i};
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

/**
 * Round R7, A4: a month opened by END TURN inside its season (no season card between) whose hand opens with four of
 * the manager's bubbles — the author's case was seed 5's third month. The fixture's steps stop before that END TURN.
 */
export function bubbleMonth():DeskState {
  for(const fixture of Object.values(loadStates())){
    let state=createInitialState(fixture.seed,content,{strict:true});
    const history:PlayedStep[]=[{id:0,action:null,before:null,after:state,events:state.events}];
    for(let i=0;i<fixture.steps.length;i++){
      const action=actionFor(state,fixture.steps[i]!),after=reduce(state,action);
      history.push({id:history.length,action,before:state,after,events:after.events});
      if(action.type==='END_TURN'&&after.phase==='play'&&after.act===state.act){
        const lane=establishedLanes(history).at(-1)??null;
        const model=deskModel({state:after,steps:history,lines:{...readLines(history),lane}});
        const bubbles=(model.messages?.messages??[]).reduce((n,m)=>n+m.bubbles.length,0);
        if(bubbles===4)return {...fixture,steps:fixture.steps.slice(0,i),hand:state.hand.map(c=>c.cardId)};
      }
      state=after;
    }
  }
  throw Error('The fixed corpus must contain a month opened by END TURN inside its season with four bubbles');
}
