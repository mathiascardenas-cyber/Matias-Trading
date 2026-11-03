/** Local, deterministic research/demo engine. No broker, live data or AI calls. */
export const TEAMS = [
  {id:'research',name:'Investigación',count:7,color:'#9ba4f4',description:'Hipótesis, datos, backtests y validación fuera de muestra.'},
  {id:'testing',name:'Pruebas',count:6,color:'#71c5b7',description:'Seis cuentas virtuales de $100.000, una estrategia por cuenta.'},
  {id:'risk',name:'Riesgo',count:12,color:'#edbc76',description:'Límites por operación, por día y por cuenta. Bloqueo de nuevas entradas.'},
  {id:'development',name:'Desarrollo',count:3,color:'#81addb',description:'Versionado, implementación y preparación de estrategias para demo.'},
  {id:'news',name:'Noticias',count:3,color:'#e899ab',description:'Filtro de eventos. En este prototipo el bloqueo se controla manualmente.'},
  {id:'operators',name:'Operadores',count:4,color:'#b8d987',description:'Supervisión de ejecuciones demo; ejecución real desconectada.'}
];
export const MARKETS = [
  {id:'XAUSD',name:'Oro',symbol:'XAUSD',initialPrice:2650,volatility:.0015,spread:.35,slippage:.10},
  {id:'NDAQ.QQ',name:'Nasdaq',symbol:'NDAQ.QQ',initialPrice:20500,volatility:.0014,spread:2,slippage:.75}
];
export const markets = MARKETS;
export const LIMITS = Object.freeze({riskPerTrade:.0025,dailyLoss:.01,totalLoss:.03,initialBalance:100000});
const INITIAL=LIMITS.initialBalance;
function random(seed){let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};}
export function generateBars(market, length=1600, seed=42){
  const rand=random(seed);let price=market.initialPrice;const bars=[];
  for(let i=0;i<length;i++){
    const regime=Math.sin(i/90)*.00028+Math.cos(i/37)*.00012;
    const move=regime+(rand()-.5)*market.volatility*2;
    const open=price;const close=open*(1+move);
    const wick=open*market.volatility*rand()*.45;
    bars.push({open,close,high:Math.max(open,close)+wick,low:Math.min(open,close)-wick});price=close;
  }return bars;
}
function signal(bars,index,kind){
  if(index<30)return 0;
  if(kind==='trend'){
    const mean=n=>{let s=0;for(let j=index-n;j<index;j++)s+=bars[j].close;return s/n;};
    const fast=mean(8),slow=mean(25);return fast>slow*1.00015?1:fast<slow*.99985?-1:0;
  }
  const window=bars.slice(index-20,index);
  const previous=bars[index-1].close;
  if(kind==='meanReversion'){
    const mean=window.reduce((sum,b)=>sum+b.close,0)/window.length;
    const deviation=Math.sqrt(window.reduce((sum,b)=>sum+(b.close-mean)**2,0)/window.length);
    if(deviation===0)return 0;
    const z=(previous-mean)/deviation;
    return z>1.5?-1:z< -1.5?1:0;
  }
  const high=Math.max(...window.slice(0,-1).map(b=>b.high));
  const low=Math.min(...window.slice(0,-1).map(b=>b.low));
  return previous>high?1:previous<low?-1:0;
}
function costs(market){return market.spread+market.slippage*2;}
function newPosition(account, market, bar, side, tick){
  const stopDistance=Math.max(bar.open*market.volatility*2.5,costs(market)*3);
  const budget=Math.max(0,account.equity)*LIMITS.riskPerTrade;
  // Quantity is a synthetic point multiplier, not lots or a broker contract size.
  const quantity=budget/(stopDistance+costs(market));
  return {side,entry:bar.open,quantity,stop:bar.open-side*stopDistance,target:bar.open+side*stopDistance*1.6,risk:budget,openedAt:tick};
}
function exitPrice(position,bar,sideSignal,age){
  const p=position;
  // Stop first when both stop and target occur within one OHLC bar.
  if((sideSignal&&sideSignal!==p.side)||age>=48)return bar.open;
  if(p.side===1){
    if(bar.low<=p.stop)return Math.min(bar.open,p.stop);
    if(bar.high>=p.target)return p.target;
  }else{
    if(bar.high>=p.stop)return Math.max(bar.open,p.stop);
    if(bar.low<=p.target)return p.target;
  }
  return null;
}
function result(position,price,market){return ((price-position.entry)*position.side-costs(market))*position.quantity;}
function metrics(trades,equities){
  let peak=INITIAL,maxDrawdown=0;
  for(const value of equities){peak=Math.max(peak,value);maxDrawdown=Math.max(maxDrawdown,(peak-value)/peak);}
  const grossProfit=trades.filter(x=>x>0).reduce((a,b)=>a+b,0);
  const grossLoss=-trades.filter(x=>x<0).reduce((a,b)=>a+b,0);
  return {trades:trades.length,pnl:trades.reduce((a,b)=>a+b,0),returnPct:trades.reduce((a,b)=>a+b,0)/INITIAL*100,maxDrawdown:maxDrawdown*100,profitFactor:grossLoss?grossProfit/grossLoss:(grossProfit?null:0),winRate:trades.length?trades.filter(x=>x>0).length/trades.length*100:0,grossProfit,grossLoss};
}
/** Signals use only bars preceding index; fills use current open and OHLC.
 * Both stop and target in one bar resolve to stop. Spread/slippage are fixed
 * synthetic assumptions. Does not model broker lots, margin or overnight fees.
 * maxDrawdown/returnPct/winRate are percentages (not fractions). */
export function backtest(bars, market, kind, start=30, end=bars.length){
  const account={equity:INITIAL};let balance=INITIAL,position=null;const trades=[],equities=[INITIAL];
  for(let index=Math.max(start,30);index<end;index++){
    const bar=bars[index],side=signal(bars,index,kind);
    if(!position&&side){account.equity=balance;position=newPosition(account,market,bar,side,index);}
    if(position){const exit=exitPrice(position,bar,side,index-position.openedAt);if(exit!==null){const pnl=result(position,exit,market);balance+=pnl;trades.push(pnl);position=null;}}
    account.equity=balance+(position?result(position,bar.close,market):0);equities.push(account.equity);
  }
  if(position){const pnl=result(position,bars[end-1].close,market);trades.push(pnl);equities.push(balance+pnl);}
  return metrics(trades,equities);
}
function strategies(){
  const names={trend:'Tendencia 8/25',breakout:'Ruptura 20',meanReversion:'Reversión a la media 20'};
  return MARKETS.flatMap((market,i)=>['trend','breakout','meanReversion'].map((kind,j)=>({id:`STR-${i*3+j+1}`,name:`${market.name} · ${names[kind]}`,marketId:market.id,kind,status:'research',version:'0.1.0',backtest:null,reason:'Hipótesis pendiente de evaluar.'})));
}
function accounts(ss){return ss.map((s,i)=>({id:`DEMO-${String(i+1).padStart(2,'0')}`,marketId:s.marketId,strategyId:s.id,balance:INITIAL,cash:INITIAL,equity:INITIAL,pnl:0,drawdown:0,maxDrawdown:0,peak:INITIAL,dayStartEquity:INITIAL,day:0,dailyPnl:0,position:null,trades:0,wins:0,status:'waiting',history:[INITIAL],lastResult:null}));}
/** Mutable state is intentionally in-memory and resets on page refresh.
 * Daily risk uses synthetic 5-minute bars: 288 ticks per day. No real calendar.
 * start returns boolean; other commands return current state. step is inert
 * while paused. emergency closes virtual positions and requires reset to resume. */
export function createLab({seed=42}={}){
  const data=Object.fromEntries(MARKETS.map((m,i)=>[m.id,generateBars(m,6000,seed+i*101)]));
  const state={running:false,emergencyStopped:false,newsBlocked:false,tick:0,phase:'research',synthetic:true,liveConnected:false,dataSource:'synthetic-deterministic',barMinutes:5,strategies:[],accounts:[],logs:[],prices:{},limits:LIMITS};
  let logId=0;
  const audit=(team,message,level='info')=>{state.logs.unshift({id:++logId,tick:state.tick,team,message,level});state.logs.length=Math.min(state.logs.length,100);};
  const stopPosition=(account,market,price,reason)=>{
    if(!account.position)return;const pnl=result(account.position,price,market);
    account.balance+=pnl;account.cash=account.balance;account.position=null;account.trades++;if(pnl>0)account.wins++;
    account.lastResult={pnl,reason,tick:state.tick};
    audit('operators',`${account.id}: cierre ${reason}, resultado sintético ${pnl.toFixed(2)} USD.`);
  };
  const mark=(a,m,bar)=>{
    a.equity=a.balance+(a.position?result(a.position,bar.close,m):0);a.pnl=a.equity-INITIAL;a.dailyPnl=a.equity-a.dayStartEquity;
    a.peak=Math.max(a.peak,a.equity);a.drawdown=(a.peak-a.equity)/a.peak*100;a.maxDrawdown=Math.max(a.maxDrawdown,a.drawdown);
  };
  function reset(){
    state.running=false;state.emergencyStopped=false;state.newsBlocked=false;state.tick=0;state.phase='research';state.strategies=strategies();state.accounts=accounts(state.strategies);state.logs=[];logId=0;
    state.prices=Object.fromEntries(MARKETS.map(m=>[m.id,data[m.id][1000].close]));
    audit('operators','Laboratorio preparado. Datos sintéticos deterministas; ejecución real desconectada.');return state;
  }
  function start(){if(state.emergencyStopped)return false;if(state.running)return true;state.running=true;audit('operators','Sesión sintética iniciada. No se envían órdenes externas.');return true;}
  function pause(){if(state.running)audit('operators','Simulación pausada; el tiempo del mercado sintético también se detiene.');state.running=false;return state;}
  function emergency(){
    state.running=false;state.emergencyStopped=true;
    for(const a of state.accounts){
      const m=MARKETS.find(m=>m.id===a.marketId),price=state.prices[m.id];
      stopPosition(a,m,price,'parada de emergencia');mark(a,m,{close:price});a.status='halted';
      a.history.push(a.equity);if(a.history.length>180)a.history.splice(0,a.history.length-180);
    }
    audit('risk','Parada de emergencia: posiciones virtuales cerradas y nuevas entradas bloqueadas hasta reiniciar.','critical');return state;
  }
  function setNewsBlocked(blocked){state.newsBlocked=Boolean(blocked);audit('news',state.newsBlocked?'Evento de prueba: nuevas entradas bloqueadas. Las posiciones abiertas siguen gestionándose.':'Filtro manual de noticias retirado. No hay calendario externo conectado.','warning');return state;}
  function step(){
    if(!state.running||state.emergencyStopped)return state;
    state.tick++;
    if(state.tick===1){
      state.phase='backtest';for(const s of state.strategies){s.status='backtest';s.reason='Evaluando 700 barras de entrenamiento y 300 fuera de muestra.';}
      audit('research','Seis hipótesis: tendencia, ruptura y reversión a la media para Oro (XAUSD) y Nasdaq (NDAQ.QQ). Backtest con costes.');
    }else if(state.tick===2){
      state.phase='development';
      for(const s of state.strategies){
        const m=MARKETS.find(m=>m.id===s.marketId),bars=data[s.marketId];
        const train=backtest(bars,m,s.kind,30,700),oos=backtest(bars,m,s.kind,700,1000);
        const eligible=train.pnl>0&&oos.pnl>0&&oos.trades>=5&&oos.maxDrawdown<3;
        s.backtest={train,oos,synthetic:true,spread:m.spread,slippage:m.slippage,trainBars:700,oosBars:300};
        s.status=eligible?'development':'rejected';s.reason=eligible?'Supera el filtro sintético; preparar versión demo.':'No supera el filtro sintético (PnL positivo en ambas muestras, ≥5 trades OOS y DD <3%).';
        audit('research',`${s.name}: ${eligible?'candidata a demo':'descartada'}; OOS ${oos.trades} operaciones, PnL ${oos.pnl.toFixed(2)} USD.`,eligible?'info':'warning');
      }
    }else if(state.tick===3){
      state.phase='demo';for(const s of state.strategies){const a=state.accounts.find(a=>a.strategyId===s.id);if(s.status==='development'){s.status='demo';s.reason='Versión demo local; sin prueba de rentabilidad real.';a.status='active';audit('development',`${s.id} v${s.version} preparada para ${a.id}.`);}else a.status='rejected';}
    }
    const barIndex=1000+state.tick;
    if(barIndex>=data[MARKETS[0].id].length){pause();audit('research','Fin de la muestra sintética. Reinicia para repetir.');return state;}
    for(const m of MARKETS)state.prices[m.id]=data[m.id][barIndex].close;
    if(state.tick>=4)for(const a of state.accounts){
      const s=state.strategies.find(s=>s.id===a.strategyId),m=MARKETS.find(m=>m.id===a.marketId),bar=data[m.id][barIndex];
      const day=Math.floor((state.tick-4)/288);
      if(day!==a.day){a.day=day;a.dayStartEquity=a.equity;if(a.status==='daily_limit')a.status='active';}
      const side=signal(data[m.id],barIndex,s.kind);
      const hadPosition=Boolean(a.position);
      if(a.position){const exit=exitPrice(a.position,bar,side,state.tick-a.position.openedAt);if(exit!==null)stopPosition(a,m,exit,'stop / objetivo / señal');}
      mark(a,m,bar);
      const totalLimit=a.equity<=INITIAL*(1-LIMITS.totalLoss);
      const dailyLimit=a.equity<=a.dayStartEquity*(1-LIMITS.dailyLoss);
      if(totalLimit||dailyLimit){
        const prior=a.status;stopPosition(a,m,bar.close,'límite de riesgo');mark(a,m,bar);a.status=totalLimit?'total_limit':'daily_limit';
        if(prior!==a.status)audit('risk',`${a.id}: ${totalLimit?'límite total 3%':'límite diario 1%'} alcanzado. Entradas bloqueadas.`,'critical');
      }
      if(a.status==='active'&&s.status==='demo'&&!state.newsBlocked&&!a.position&&!hadPosition&&side){
        const p=newPosition(a,m,bar,side,state.tick);
        const dailyBudget=a.equity-a.dayStartEquity*(1-LIMITS.dailyLoss);
        const totalBudget=a.equity-INITIAL*(1-LIMITS.totalLoss);
        if(p.risk<=Math.min(dailyBudget,totalBudget)){a.position=p;const exit=exitPrice(p,bar,side,0);if(exit!==null)stopPosition(a,m,exit,'stop / objetivo');mark(a,m,bar);audit('risk',`${a.id}: ${side===1?'compra':'venta'} virtual ${m.name}; riesgo planificado ${p.risk.toFixed(2)} USD (0,25%).`);}
      }
      if(s.status==='demo'&&a.trades>=30&&state.tick>=120&&!a.position){s.status='review';s.reason='Muestra demo completada. Requiere evaluación humana y datos reales; no aprueba operar real.';a.status='review';audit('operators',`${s.id}: pendiente de revisión. Ejecución real permanece desconectada.`);}
      a.history.push(a.equity);if(a.history.length>180)a.history.splice(0,a.history.length-180);
    }
    if(state.tick%12===0)audit('risk','Revisión de cuentas: límites por operación, diario y total. Riesgo de gap real no modelado.');
    return state;
  }
  reset();return {state,start,pause,step,emergency,reset,setNewsBlocked};
}
