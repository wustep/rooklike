import { test, expect } from '@playwright/test';
import { newRun, getChess, chooseMove, type Run, SAVE_KEY, ENCOUNTERS, shopStock } from '../src/game';

test('desktop: drag a piece to a legal square and cancel an invalid drop',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.addInitScript(()=>localStorage.setItem('rooklike-welcomed','1'));
  await page.goto('/');
  await page.locator('[data-square="b1"]').dragTo(page.locator('[data-square="c3"]'));
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!).moves.length===2);
  await expect(page.locator('[data-square="c3"]')).toHaveAttribute('aria-label',/your Knight/);
  await page.locator('[data-square="c1"]').hover();
  await page.mouse.down();
  await page.mouse.move(40,40);
  await page.mouse.up();
  await expect(page.locator('[data-square="c1"]')).toHaveAttribute('aria-label',/your Bishop/);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!).moves.length)).toBe(2);
});
test('desktop: onboarding, legal moves, enemy reply, takeback, keyboard, save and help',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  await expect(page.getByRole('dialog',{name:'Welcome to Rooklike'})).toBeVisible();await page.getByRole('button',{name:'Begin your journey'}).click();
  await expect(page.locator('.square')).toHaveCount(64);
  expect(await page.locator('.board-frame').evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  expect(await page.locator('.board-scene').evaluate(el=>getComputedStyle(el).perspective)).toBe('none');
  await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
  await page.locator('[data-square="b1"]').click();await expect(page.locator('[data-square="c3"]')).toHaveClass(/legal/);
  await page.locator('[data-square="c3"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!).moves.length===2);
  await expect(page.locator('[data-square="c3"]')).toHaveAttribute('aria-label',/your Knight/);
  const takeback=page.getByRole('button',{name:/Takeback/});
  await takeback.click();
  await expect(page.locator('[data-square="b1"]')).toHaveAttribute('aria-label',/your Knight/);
  await expect(page.locator('.charge-count')).toHaveText('1');
  await expect(takeback).toBeDisabled();
  await page.keyboard.press('h');await expect(page.locator('.threat-dot').first()).toBeVisible();
  await page.locator('[data-square="e2"]').focus();await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!).moves.length===2);
  const saved=await page.evaluate(()=>localStorage.getItem('rooklike-run-v1'));await page.reload();expect(await page.evaluate(()=>localStorage.getItem('rooklike-run-v1'))).toBe(saved);
  await page.getByRole('button',{name:'How to play',exact:true}).click();await expect(page.getByRole('dialog',{name:'How to play'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('desktop: takeback can rewind several turns in a row',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.addInitScript(()=>localStorage.setItem('rooklike-welcomed','1'));
  await page.goto('/');
  await page.locator('[data-square="e2"]').click();await page.locator('[data-square="e4"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!).moves.length===2);
  await page.locator('[data-square="b1"]').click();await page.locator('[data-square="c3"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!).moves.length===4);
  const takeback=page.getByRole('button',{name:/Takeback/});
  await expect(takeback).toBeEnabled();
  await takeback.click();
  await expect(page.locator('[data-square="b1"]')).toHaveAttribute('aria-label',/your Knight/);
  await expect(page.locator('[data-square="e4"]')).toHaveAttribute('aria-label',/your Pawn/);
  await expect(page.locator('.charge-count')).toHaveText('1');
  await expect(takeback).toBeEnabled();
  await takeback.click();
  await expect(page.locator('[data-square="e2"]')).toHaveAttribute('aria-label',/your Pawn/);
  await expect(page.locator('.charge-count')).toHaveText('0');
  await expect(takeback).toBeDisabled();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!).moves)).toEqual([]);
});
test('reward persists across reload, recruits deploy, and theme changes',async({page})=>{
  let run=newRun();run.initialFen='7k/8/8/8/8/r7/8/R3K3 w - - 0 1';run.elite='a3';run.positions={a1:'rook',e1:'king'};run.army=[{id:'king',type:'k'},{id:'rook',type:'r'}];
  await page.addInitScript(({run,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(run));localStorage.setItem('rooklike-welcomed','1');},{run,key:SAVE_KEY});await page.goto('/');
  await page.locator('[data-square="a1"]').click();await page.locator('[data-square="a3"]').click();
  await expect(page.getByRole('dialog',{name:'Encounter won'})).toBeVisible();
  await page.getByRole('button',{name:/A willing knight/}).click();
  await page.reload();await expect(page.getByRole('button',{name:/A willing knight/})).toBeDisabled();
  await page.getByRole('button',{name:'Recruit Rook for 35 crowns'}).click();
  await page.screenshot({path:'artifacts/rewards.png',fullPage:true});
  await page.getByRole('button',{name:/Continue to/}).click();await expect(page.locator('.app')).toHaveClass(/theme-marsh/);
  await expect(page.getByRole('heading',{name:'A Knight in the Mire'})).toBeVisible();
  const state:Run=await page.evaluate(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!));expect(state.army).toHaveLength(4);expect(state.coins).toBe(27);
});

test('promotion choice can cause a material draw; final board remains ended',async({page})=>{
  let run=newRun();run.initialFen='7k/P7/8/8/8/8/8/4K3 w - - 0 1';run.elite='h8';run.positions={a7:'pawn1',e1:'king'};run.army=[{id:'king',type:'k'},{id:'pawn1',type:'p'}];
  await page.addInitScript(({run,key})=>{localStorage.setItem(key,JSON.stringify(run));localStorage.setItem('rooklike-welcomed','1');},{run,key:SAVE_KEY});await page.goto('/');await page.locator('[data-square="a7"]').click();await page.locator('[data-square="a8"]').click();await expect(page.getByRole('dialog',{name:'Choose promotion'})).toBeVisible();await page.getByRole('button',{name:'Knight',exact:true}).click();await expect(page.getByRole('dialog',{name:'Journey ended'})).toBeVisible();
  await page.getByRole('button',{name:/Study the final board/}).click();await expect(page.locator('.study-banner')).toContainText('draw');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!).phase)).toBe('draw');
});

test('mobile: board fits and controls stay usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Begin your journey'}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.locator('[data-square="b1"]').click();await page.screenshot({path:'artifacts/mobile.png',fullPage:true});await page.locator('[data-square="c3"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!).moves.length===2);
  await page.getByRole('button',{name:/Threats/}).click();await expect(page.locator('.threat-dot').first()).toBeVisible();
  await page.getByRole('button',{name:'How to play',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Back to the board'}).click();
});

test('complete act through the UI: fight, recruit, advance, defeat the boss',async({page})=>{
  test.setTimeout(900000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,run})=>localStorage.setItem(key,JSON.stringify(run)),{key:SAVE_KEY,run:newRun('wanderer',42)});
  await page.goto('/');await page.getByRole('button',{name:'Begin your journey'}).click();
  for(let stage=0;stage<ENCOUNTERS.length;stage++){
    for(let turns=0;turns<100;turns++){
      const run:Run=await page.evaluate(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!));
      if(run.phase!=='battle')break;
      const chess=getChess(run);expect(chess.turn()).toBe('w');
      const move=chooseMove(chess,'tactician',run.elite,run.stage)!;expect(move).toBeTruthy();
      await page.locator(`[data-square="${move.from}"]`).click();await page.locator(`[data-square="${move.to}"]`).click();
      if(move.promotion)await page.getByRole('button',{name:({q:'Queen',r:'Rook',b:'Bishop',n:'Knight'} as Record<string,string>)[move.promotion],exact:true}).click();
      await page.waitForFunction(()=>{const r=JSON.parse(localStorage.getItem('rooklike-run-v1')!);return r.phase!=='battle'||r.moves.length%2===0;});
    }
    if(stage<ENCOUNTERS.length-1){
      await expect(page.getByRole('dialog',{name:'Encounter won'})).toBeVisible();
      const recruit=page.getByRole('button',{name:/A willing/});
      if(await recruit.isEnabled())await recruit.click();else await page.getByRole('button',{name:/Second Thought/}).click();
      if(stage%4===3){const veteran=page.getByRole('button',{name:/A veteran rook/});if(await veteran.isEnabled())await veteran.click();else await page.getByRole('button',{name:/The war chest/}).click();}
      const state:Run=await page.evaluate(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!));
      const offer=[...shopStock(state)].reverse().find(item=>item.cost<=state.coins&&item.type!=='p');
      if(offer&&state.army.length<12)await page.getByRole('button',{name:`Recruit ${({q:'Queen',r:'Rook',b:'Bishop',n:'Knight',p:'Pawn',k:'King'} as const)[offer.type]} for ${offer.cost} crowns`}).click();
      await page.getByRole('button',{name:/Continue to/}).click();
    }
  }
  await expect(page.getByRole('dialog',{name:'Campaign complete'})).toBeVisible();
  await page.screenshot({path:'artifacts/victory.png',fullPage:true});expect(errors).toEqual([]);
});
