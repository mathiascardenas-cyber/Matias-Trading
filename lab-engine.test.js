import test from 'node:test';
import assert from 'node:assert/strict';
import {createLab,MARKETS,TEAMS,LIMITS,generateBars,backtest} from './lab-engine.js';
const run=(lab,n)=>{lab.start();for(let i=0;i<n;i++)lab.step();return lab.state;};
test('team sizes, synthetic-only markets and six isolated 100k accounts',()=>{
 const lab=createLab();
 assert.deepEqual(TEAMS.map(t=>t.count),[7,6,12,3,3,4]);
 assert.deepEqual(MARKETS.map(m=>m.id),['XAUSD','NDAQ.QQ']);
 assert.deepEqual(MARKETS.map(m=>m.symbol),['XAUSD','NDAQ.QQ']);
 assert.equal(lab.state.accounts.length,6);
 for(const m of MARKETS){
  assert.equal(lab.state.accounts.filter(a=>a.marketId===m.id).length,3);
  assert.deepEqual(lab.state.strategies.filter(s=>s.marketId===m.id).map(s=>s.kind),['trend','breakout','meanReversion']);
 }
 assert.ok(lab.state.accounts.every(a=>a.balance===100000&&!a.position));
 assert.equal(lab.state.liveConnected,false);
});
test('price series and full simulation are deterministic for a given seed',()=>{
 assert.deepEqual(generateBars(MARKETS[0],100,123),generateBars(MARKETS[0],100,123));
 assert.notDeepEqual(generateBars(MARKETS[0],100,123),generateBars(MARKETS[0],100,124));
 const one=createLab(),two=createLab();run(one,400);run(two,400);
 assert.deepEqual(one.state,two.state);
});
test('backtest uses training and untouched OOS slices with costs and actual trades',()=>{
 const lab=createLab();run(lab,3);
 for(const s of lab.state.strategies){
  assert.equal(s.backtest.synthetic,true);
  assert.equal(s.backtest.trainBars,700);assert.equal(s.backtest.oosBars,300);
  for(const result of [s.backtest.train,s.backtest.oos]){
   assert.ok(result.trades>0);assert.ok(Number.isFinite(result.pnl));
   assert.ok(result.maxDrawdown>=0);assert.ok(result.winRate>=0&&result.winRate<=100);
  }
 }
 const m=MARKETS[0],bars=generateBars(m,700);
 const free=backtest(bars,{...m,spread:0,slippage:0},'trend');
 const costly=backtest(bars,m,'trend');
 assert.notEqual(free.pnl,costly.pnl);
});
test('future bars cannot alter the past backtest',()=>{
 const m=MARKETS[0],bars=generateBars(m,1000);
 const original=backtest(bars,m,'trend',30,700);
 const altered=bars.map((b,i)=>i<700?b:{open:1,close:1,high:1,low:1});
 assert.deepEqual(backtest(altered,m,'trend',30,700),original);
});
test('research, backtest, development and demo remain separate stages',()=>{
 const lab=createLab();lab.start();
 assert.equal(lab.state.phase,'research');
 lab.step();assert.ok(lab.state.strategies.every(s=>s.status==='backtest'));
 lab.step();assert.ok(lab.state.strategies.every(s=>['development','rejected'].includes(s.status)));
 lab.step();assert.ok(lab.state.strategies.every(s=>['demo','rejected'].includes(s.status)));
 assert.equal(lab.state.accounts.reduce((s,a)=>s+a.trades,0),0);
});
test('pause freezes market and positions; news blocks entries while exits stay active',()=>{
 const lab=createLab();run(lab,3);lab.setNewsBlocked(true);run(lab,60);
 assert.ok(lab.state.accounts.every(a=>!a.position&&a.trades===0));
 lab.setNewsBlocked(false);run(lab,50);
 assert.ok(lab.state.accounts.some(a=>a.trades>0||a.position));
 lab.pause();const snapshot=JSON.stringify(lab.state);lab.step();assert.equal(JSON.stringify(lab.state),snapshot);
 lab.start();lab.setNewsBlocked(true);run(lab,60);
 assert.ok(lab.state.accounts.every(a=>!a.position));
});
test('position loss budget is 0.25% at entry and never exceeds remaining limits',()=>{
 const lab=createLab();lab.start();let seen=false;
 for(let i=0;i<600;i++){
  const before=lab.state.accounts.map(a=>({position:a.position,equity:a.equity}));
  lab.step();
  lab.state.accounts.forEach((a,j)=>{
   if(a.position&&!before[j].position){
    seen=true;assert.ok(a.position.risk<=before[j].equity*LIMITS.riskPerTrade+1e-6);
    assert.ok(a.position.risk<=before[j].equity-97000+1e-6);
   }
  });
 }
 assert.ok(seen);
});
test('daily and total account loss limits block new trades independently',()=>{
 const lab=createLab();run(lab,3);
 const [daily,total]=lab.state.accounts.filter(a=>a.status==='active');
 assert.ok(daily&&total,'fixture needs two eligible candidates');
 daily.balance=daily.cash=daily.equity=98900;
 total.balance=total.cash=total.equity=96900;
 lab.step();
 assert.equal(daily.status,'daily_limit');assert.equal(total.status,'total_limit');
 assert.equal(daily.position,null);assert.equal(total.position,null);
 run(lab,5);assert.equal(daily.trades,0);assert.equal(total.trades,0);
});
test('emergency closes virtual positions and cannot be resumed without reset',()=>{
 const lab=createLab();run(lab,20);lab.emergency();
 assert.ok(lab.state.emergencyStopped);assert.equal(lab.state.running,false);
 assert.ok(lab.state.accounts.every(a=>!a.position&&a.status==='halted'));
 assert.equal(lab.start(),false);const tick=lab.state.tick;lab.step();assert.equal(lab.state.tick,tick);
 lab.reset();assert.equal(lab.state.tick,0);assert.equal(lab.state.emergencyStopped,false);
 assert.ok(lab.state.accounts.every(a=>a.equity===100000&&a.trades===0));
 assert.ok(lab.start());
});
test('audit is bounded; no stage becomes live or approved automatically',()=>{
 const lab=createLab();run(lab,1500);
 assert.ok(lab.state.logs.length<=100);assert.ok(lab.state.logs.length>0);
 assert.equal(lab.state.liveConnected,false);
 assert.ok(lab.state.strategies.every(s=>!['live','approved'].includes(s.status)));
 assert.ok(lab.state.strategies.some(s=>s.status==='review'));
});
test('emergency reconciles equity, drawdown, peak and latest bounded history after closing',()=>{
 const lab=createLab(),loss=lab.state.accounts[0];
 const gain=lab.state.accounts.find(a=>a.marketId!==loss.marketId);
 lab.state.prices[loss.marketId]=90;loss.peak=102000;
 loss.history=Array(180).fill(100000);
 loss.position={side:1,entry:100,quantity:2};
 lab.state.prices[gain.marketId]=120;gain.position={side:1,entry:100,quantity:1000};
 lab.emergency();
 const expectedLoss=100000+((-10)-(.35+.1*2))*2;
 assert.ok(Math.abs(loss.balance-expectedLoss)<1e-8);
 assert.equal(loss.equity,loss.balance);assert.equal(loss.cash,loss.balance);
 assert.equal(loss.pnl,loss.equity-100000);assert.equal(loss.dailyPnl,loss.equity-loss.dayStartEquity);
 assert.equal(loss.drawdown,(loss.peak-loss.equity)/loss.peak*100);
 assert.equal(loss.maxDrawdown,loss.drawdown);assert.equal(loss.peak,102000);
 assert.equal(loss.history.length,180);assert.equal(loss.history.at(-1),loss.equity);
 assert.ok(gain.equity>100000);assert.equal(gain.peak,gain.equity);assert.equal(gain.drawdown,0);
 assert.equal(gain.history.at(-1),gain.equity);assert.equal(gain.trades,1);assert.equal(gain.wins,1);
});
const trendWarmup=()=>Array.from({length:30},(_,i)=>({open:100+i,close:100+i,high:100+i,low:100+i}));
const fixtureMarket={id:'FIXTURE',initialPrice:100,volatility:.01,spread:1,slippage:.5};
test('ambiguous OHLC that hits both long stop and target resolves to the stop',()=>{
 // Prior rising bars signal long. Entry 100, cost 2, stop distance 6,
 // quantity 250/(6+2)=31.25; both stop 94 and target 109.6 occur.
 const bars=[...trendWarmup(),{open:100,high:120,low:80,close:100}];
 const r=backtest(bars,fixtureMarket,'trend',30,31);
 assert.equal(r.trades,1);assert.equal(r.pnl,-250);assert.equal(r.grossLoss,250);
 assert.equal(r.winRate,0);assert.equal(r.maxDrawdown,.25);
});
test('exact round-trip costs reduce a forced-close result by spread and two slippages',()=>{
 const bars=[...trendWarmup(),{open:100,high:101,low:99,close:101}];
 const r=backtest(bars,fixtureMarket,'trend',30,31);
 // Stops untouched. Forced close at 101: (1 - (1 + 2*0.5))*31.25.
 assert.equal(r.trades,1);assert.equal(r.pnl,-31.25);assert.equal(r.grossLoss,31.25);
 assert.equal(r.maxDrawdown,.03125);
});
test('rolling equity history retains the newest values after reaching the cap',()=>{
 const lab=createLab();run(lab,250);
 for(const a of lab.state.accounts){assert.equal(a.history.length,180);assert.equal(a.history.at(-1),a.equity);}
});
test('mean reversion sells an upper-tail deviation using past bars only',()=>{
 const past=Array.from({length:30},(_,i)=>({open:i===29?120:100,close:i===29?120:100,high:i===29?120:100,low:i===29?120:100}));
 const bars=[...past,{open:120,high:121,low:115,close:115}];
 const r=backtest(bars,fixtureMarket,'meanReversion',30,31);
 // Prior close 120 exceeds +1.5 sigma of prior 20 bars: short at 120.
 // Close at 115, cost 2 and quantity 31.25 yields (5-2)*31.25.
 assert.equal(r.trades,1);assert.equal(r.pnl,93.75);
 const future=[...bars,{open:1,high:1000,low:1,close:999}];
 assert.deepEqual(backtest(future,fixtureMarket,'meanReversion',30,31),r);
});
test('mean-reversion candidates still obey the same independent profitability filter',()=>{
 const lab=createLab();run(lab,3);
 const reversions=lab.state.strategies.filter(s=>s.kind==='meanReversion');
 assert.equal(reversions.length,2);
 for(const s of reversions){
  const {train,oos}=s.backtest;
  const eligible=train.pnl>0&&oos.pnl>0&&oos.trades>=5&&oos.maxDrawdown<3;
  assert.equal(s.status,eligible?'demo':'rejected');
  const a=lab.state.accounts.find(a=>a.strategyId===s.id);
  assert.equal(a.status,eligible?'active':'rejected');
 }
});
