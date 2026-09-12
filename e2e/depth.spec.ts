import { test, expect } from '@playwright/test';
import { newRun, SAVE_KEY, type Run } from '../src/game';
async function seed(page: import('@playwright/test').Page, run: Run) {
  await page.addInitScript(({run,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(run));localStorage.setItem('rooklike-welcomed','1');},{run,key:SAVE_KEY});
  await page.goto('/');
}
test('a relic choice, roster change and dangerous road persist and deploy on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await seed(page,{...newRun(),phase:'reward',coins:70,earned:47,payout:[{label:'Captain bounty',amount:25},{label:'Everyone home',amount:10},{label:'Swift passage',amount:12}]});
  await page.getByRole('button',{name:/Forked Spurs/}).click();
  await expect(page.locator('.reward-choice.packed')).toContainText('Forked Spurs');
  await page.getByRole('button',{name:/Review company/}).click();
  await page.getByRole('button',{name:/Send bishop home/}).click();
  await page.getByRole('button',{name:'Recruit Knight for 25 crowns'}).click();
  await page.getByRole('button',{name:/The dangerous road/}).click();
  await page.reload();
  await expect(page.locator('.reward-choice.packed')).toContainText('Forked Spurs');
  await expect(page.getByRole('button',{name:/The dangerous road/})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button',{name:/Continue to/}).click();
  await expect(page.locator('[data-square="b6"]')).toHaveAttribute('aria-label',/enemy Knight/);
  const run:Run=await page.evaluate(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!));
  expect(run.coins).toBe(51);expect(run.charges).toBe(2);expect(run.army.filter(u=>u.type==='n')).toHaveLength(2);expect(run.relics).toContain('spurs');
});
test('enemy inspection traces attacks and changes the position read',async({page})=>{
  await seed(page,newRun());await page.locator('[data-square="d5"]').click();
  await expect(page.locator('[data-square="d4"]')).toHaveClass(/enemy-reach/);
  await expect(page.locator('.position-read')).toContainText('Rook on d5');
  await expect(page.getByRole('heading',{name:'Briar Sentinel'})).toBeVisible();
  await page.locator('[data-square="b1"]').click();
  await expect(page.locator('.enemy-reach')).toHaveCount(0);await expect(page.locator('[data-square="c3"]')).toHaveClass(/legal/);
});
test('a remaining Takeback can rescue the last turn after checkmate',async({page})=>{
  const run={...newRun(),initialFen:'8/1b6/8/8/5kq1/8/6PP/R6K w - - 0 1',elite:'g4' as const,positions:{a1:'rook',h1:'king',g2:'pawn1',h2:'pawn2'},army:[{id:'rook',type:'r' as const},{id:'king',type:'k' as const},{id:'pawn1',type:'p' as const},{id:'pawn2',type:'p' as const}]};
  await seed(page,run);await page.locator('[data-square="a1"]').click();await page.locator('[data-square="b1"]').click();
  await expect(page.getByRole('dialog',{name:'Journey ended'})).toBeVisible();
  await expect(page.locator('.king-check')).toHaveCount(1);await expect(page.locator('.checking-piece')).toHaveCount(1);
  await expect(page.locator('.turn-bar')).toContainText('Checkmate.');
  await page.getByRole('button',{name:/Spend a Takeback/}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-square="a1"]')).toHaveAttribute('aria-label',/your Rook/);await expect(page.locator('[data-square="g2"]')).toHaveAttribute('aria-label',/your Pawn/);
  const restored:Run=await page.evaluate(()=>JSON.parse(localStorage.getItem('rooklike-run-v1')!));expect(restored.phase).toBe('battle');expect(restored.charges).toBe(1);expect(restored.moves).toEqual([]);
});

 test('an act break grants one provision and shows the next act',async({page})=>{
  await seed(page,{...newRun('wanderer',42),stage:3,phase:'reward',rewardClaimed:true,claimedReward:'hourglass'});
  await expect(page.getByRole('button',{name:/Continue to/})).toBeDisabled();
  await page.getByRole('button',{name:/A veteran rook/}).click();
  await expect(page.getByRole('button',{name:/A veteran rook/})).toBeDisabled();
  await page.getByRole('button',{name:/Continue to/}).click();
  await expect(page.locator('.chapter')).toContainText('ACT II');
 });
 test('an unsafe saved board is repaired before any input or AI move',async({page})=>{
  const run={...newRun('wanderer',42),initialFen:'6k1/8/8/8/4r3/8/8/4K3 w - - 0 1'};
  await seed(page,run);await expect(page.locator('.king-check')).toHaveCount(0);
  await page.getByRole('button',{name:/Move journal/}).click();await expect(page.locator('.journal .latest-entry')).toContainText('unsafe saved deployment');
  await page.locator('[data-square="e1"]').click();await expect(page.locator('[data-square="g8"]')).not.toHaveClass(/legal/);
 });
