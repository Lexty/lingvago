// Regression tests from review: a self-report lands on its own attempt, and
// focus survives the buttons that disappear when pressed.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../i18n/config.ts';
import { findPack } from '../packs/index.ts';
import AuthoredDrill from './AuthoredDrill.tsx';
vi.mock('./RuleLink.tsx', () => ({default: () => <button>Rule</button>}));
afterEach(cleanup);
beforeEach(async () => { await i18n.changeLanguage('en'); });
const group = findPack('unit-19')!.groups.find(g => g.id === 'indefinidos')!;
const entries = group.exercises.slice(0,2).map(exercise => ({group, exercise}));
function deferred(){ let resolve!: (n:number)=>void; const promise = new Promise<number>(r=>{resolve=r}); return {promise,resolve}; }
function wrong(){fireEvent.change(screen.getByTestId('review-answer'),{target:{value:'wrong'}});fireEvent.click(screen.getByRole('button',{name:'Check'}));}
function view(onRecord:()=>Promise<number>,onSelfReport=vi.fn(async()=>{})){
 render(<AuthoredDrill testIdBase="review" entries={entries} onExhausted={()=>{}} onRecord={onRecord} onSelfReport={onSelfReport}/>); return onSelfReport;
}
it('persists an early self-report once its attempt ID resolves',async()=>{
 const d=deferred(); const report=view(()=>d.promise); wrong();
 fireEvent.click(screen.getByTestId('review-self-report'));
 await act(async()=>{d.resolve(101);await d.promise});
 expect(report).toHaveBeenCalledWith(101);
});
it('does not let a previous late ID replace the current attempt ID',async()=>{
 const a=deferred(),b=deferred(); const save=vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise); const report=view(save);
 wrong(); fireEvent.click(screen.getByRole('button',{name:'Next'})); wrong();
 await act(async()=>{a.resolve(101);await a.promise});
 fireEvent.click(screen.getByTestId('review-self-report'));
 await act(async()=>{b.resolve(202);await b.promise});
 expect(report).toHaveBeenCalledWith(202);
});
it('keeps keyboard focus after revealing a typed-answer item',()=>{
 view(async()=>101);fireEvent.click(screen.getByTestId('review-help'));
 const reveal=screen.getByTestId('review-reveal');reveal.focus();fireEvent.click(reveal);
 expect(document.activeElement).not.toBe(document.body);
});
it('keeps keyboard focus after self-report replaces its button',async()=>{
 view(async()=>101);wrong();await act(async()=>{});
 const report=screen.getByTestId('review-self-report');report.focus();fireEvent.click(report);
 expect(document.activeElement).not.toBe(document.body);
});
