import { useState, useCallback, useRef } from "react";

const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const SUIT_SYMBOLS = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
const SUIT_COLORS = { spades: "#1a1a2e", hearts: "#e63946", diamonds: "#457b9d", clubs: "#2d6a4f" };
const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14];
const RANK_LABELS = {2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"10",11:"J",12:"Q",13:"K",14:"A"};

const PAY_TABLES = {
  "jacks-9-6": {
    name: "Jacks or Better", shortName: "9/6", returnPct: 99.54,
    hands: [
      { name: "Royal Flush", pay: [250,500,750,1000,4000] },
      { name: "Straight Flush", pay: [50,100,150,200,250] },
      { name: "Four of a Kind", pay: [25,50,75,100,125] },
      { name: "Full House", pay: [9,18,27,36,45] },
      { name: "Flush", pay: [6,12,18,24,30] },
      { name: "Straight", pay: [4,8,12,16,20] },
      { name: "Three of a Kind", pay: [3,6,9,12,15] },
      { name: "Two Pair", pay: [2,4,6,8,10] },
      { name: "Jacks or Better", pay: [1,2,3,4,5] },
    ]
  },
  "jacks-8-5": {
    name: "Jacks or Better", shortName: "8/5", returnPct: 97.30,
    hands: [
      { name: "Royal Flush", pay: [250,500,750,1000,4000] },
      { name: "Straight Flush", pay: [50,100,150,200,250] },
      { name: "Four of a Kind", pay: [25,50,75,100,125] },
      { name: "Full House", pay: [8,16,24,32,40] },
      { name: "Flush", pay: [5,10,15,20,25] },
      { name: "Straight", pay: [4,8,12,16,20] },
      { name: "Three of a Kind", pay: [3,6,9,12,15] },
      { name: "Two Pair", pay: [2,4,6,8,10] },
      { name: "Jacks or Better", pay: [1,2,3,4,5] },
    ]
  },
  "double-bonus-10-7": {
    name: "Double Bonus", shortName: "10/7", returnPct: 100.17,
    hands: [
      { name: "Royal Flush", pay: [250,500,750,1000,4000] },
      { name: "Straight Flush", pay: [50,100,150,200,250] },
      { name: "Four Aces", pay: [160,320,480,640,800] },
      { name: "Four 2s-4s", pay: [80,160,240,320,400] },
      { name: "Four 5s-Ks", pay: [50,100,150,200,250] },
      { name: "Full House", pay: [10,20,30,40,50] },
      { name: "Flush", pay: [7,14,21,28,35] },
      { name: "Straight", pay: [5,10,15,20,25] },
      { name: "Three of a Kind", pay: [3,6,9,12,15] },
      { name: "Two Pair", pay: [1,2,3,4,5] },
      { name: "Jacks or Better", pay: [1,2,3,4,5] },
    ]
  },
  "deuces-wild": {
    name: "Deuces Wild", shortName: "Full Pay", returnPct: 100.76,
    hands: [
      { name: "Natural Royal", pay: [250,500,750,1000,4000] },
      { name: "Four Deuces", pay: [200,400,600,800,1000] },
      { name: "Wild Royal", pay: [25,50,75,100,125] },
      { name: "Five of a Kind", pay: [15,30,45,60,75] },
      { name: "Straight Flush", pay: [9,18,27,36,45] },
      { name: "Four of a Kind", pay: [5,10,15,20,25] },
      { name: "Full House", pay: [3,6,9,12,15] },
      { name: "Flush", pay: [2,4,6,8,10] },
      { name: "Straight", pay: [2,4,6,8,10] },
      { name: "Three of a Kind", pay: [1,2,3,4,5] },
    ]
  }
};

function evaluateHand(cards, payTableId) {
  if (cards.length !== 5) return null;
  const ranks = cards.map(c => c.rank).sort((a,b) => a - b);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const rc = {};
  ranks.forEach(r => { rc[r] = (rc[r]||0)+1; });
  const counts = Object.values(rc).sort((a,b) => b-a);
  const ur = [...new Set(ranks)].sort((a,b) => a-b);
  const isStraight = (ur.length===5 && ur[4]-ur[0]===4) || ur.join(",") === "2,3,4,5,14";
  if (isFlush && ur.join(",") === "10,11,12,13,14") return "Royal Flush";
  if (isFlush && isStraight) return "Straight Flush";
  if (counts[0]===4) {
    if (payTableId === "double-bonus-10-7") {
      const qr = +Object.keys(rc).find(r => rc[r]===4);
      if (qr===14) return "Four Aces";
      if (qr>=2 && qr<=4) return "Four 2s-4s";
      return "Four 5s-Ks";
    }
    return "Four of a Kind";
  }
  if (counts[0]===3 && counts[1]===2) return "Full House";
  if (isFlush) return "Flush";
  if (isStraight) return "Straight";
  if (counts[0]===3) return "Three of a Kind";
  if (counts[0]===2 && counts[1]===2) return "Two Pair";
  if (counts[0]===2) {
    const pr = +Object.keys(rc).find(r => rc[r]===2);
    if (pr >= 11) return "Jacks or Better";
  }
  return null;
}

function createDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({rank:r, suit:s, id:`${r}${s[0]}`});
  return d;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length-1; i > 0; i--) {
    const a = new Uint32Array(1); crypto.getRandomValues(a);
    const j = a[0] % (i+1); [d[i],d[j]] = [d[j],d[i]];
  }
  return d;
}

function CardSlot({ card, isHeld, isDimmed, isFaceDown, onToggleHold, canHold }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      {/* HELD badge */}
      <div style={{ height:"22px", display:"flex", alignItems:"center", marginBottom:"3px" }}>
        {isHeld && <div style={{
          background:"linear-gradient(135deg,#c9a227,#ffd60a)", color:"#1a1a2e",
          fontSize:"0.58rem", fontWeight:800, padding:"2px 10px", borderRadius:"4px",
          letterSpacing:"0.12em", boxShadow:"0 0 10px rgba(201,162,39,0.5)",
          animation:"heldPop .15s ease-out",
        }}>HELD</div>}
      </div>
      {/* Card */}
      <div style={{
        width:"clamp(58px,12vw,110px)", height:"clamp(81px,16.8vw,154px)",
        borderRadius:"8px", position:"relative", perspective:"600px",
        transform: isHeld ? "translateY(-10px)" : "translateY(0)",
        transition:"transform .15s ease",
      }}>
        <div style={{
          width:"100%", height:"100%", transformStyle:"preserve-3d",
          transition:"transform .4s ease",
          transform: isFaceDown ? "rotateY(180deg)" : "rotateY(0deg)",
        }}>
          {/* Front */}
          <div style={{
            position:"absolute", inset:0, backfaceVisibility:"hidden", borderRadius:"8px",
            background:"#fff",
            border: isHeld ? "2.5px solid #c9a227" : "1px solid #c8c8d4",
            boxShadow: isHeld ? "0 0 18px rgba(201,162,39,.5),0 4px 12px rgba(0,0,0,.2)" : "0 2px 8px rgba(0,0,0,.15)",
            display:"flex", flexDirection:"column", justifyContent:"space-between",
            padding:"clamp(3px,.7vw,7px)", overflow:"hidden",
            opacity: isDimmed ? .5 : 1, transition:"opacity .15s,border-color .15s,box-shadow .15s",
          }}>
            {card && (<>
              <div>
                <div style={{fontSize:"clamp(.85rem,2.1vw,1.35rem)",fontWeight:700,fontFamily:"'Fira Code',monospace",color:SUIT_COLORS[card.suit],lineHeight:1}}>{RANK_LABELS[card.rank]}</div>
                <div style={{fontSize:"clamp(.55rem,1.4vw,.85rem)",color:SUIT_COLORS[card.suit],lineHeight:1,marginTop:"1px"}}>{SUIT_SYMBOLS[card.suit]}</div>
              </div>
              <div style={{fontSize:"clamp(1.4rem,4vw,2.6rem)",color:SUIT_COLORS[card.suit],textAlign:"center",flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>{SUIT_SYMBOLS[card.suit]}</div>
              <div style={{textAlign:"right",transform:"rotate(180deg)"}}>
                <div style={{fontSize:"clamp(.85rem,2.1vw,1.35rem)",fontWeight:700,fontFamily:"'Fira Code',monospace",color:SUIT_COLORS[card.suit],lineHeight:1}}>{RANK_LABELS[card.rank]}</div>
                <div style={{fontSize:"clamp(.55rem,1.4vw,.85rem)",color:SUIT_COLORS[card.suit],lineHeight:1,marginTop:"1px"}}>{SUIT_SYMBOLS[card.suit]}</div>
              </div>
            </>)}
          </div>
          {/* Back */}
          <div style={{
            position:"absolute", inset:0, backfaceVisibility:"hidden",
            transform:"rotateY(180deg)", borderRadius:"8px",
            background:"linear-gradient(135deg,#8b1a1a 0%,#6b1010 50%,#8b1a1a 100%)",
            border:"2px solid #c9a227",
            boxShadow:"0 2px 8px rgba(0,0,0,.3),inset 0 0 30px rgba(0,0,0,.25)",
            overflow:"hidden",
          }}>
            <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(45deg,transparent 0px,transparent 5px,rgba(255,255,255,.05) 5px,rgba(255,255,255,.05) 6px),repeating-linear-gradient(-45deg,transparent 0px,transparent 5px,rgba(255,255,255,.05) 5px,rgba(255,255,255,.05) 6px)"}}/>
            <div style={{position:"absolute",inset:"4px",border:"1.5px solid rgba(201,162,39,.5)",borderRadius:"5px"}}/>
            <div style={{position:"absolute",inset:"8px",border:"1px solid rgba(201,162,39,.25)",borderRadius:"4px"}}/>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%) rotate(45deg)",width:"clamp(13px,2.8vw,22px)",height:"clamp(13px,2.8vw,22px)",border:"1.5px solid rgba(201,162,39,.6)",background:"rgba(201,162,39,.1)"}}/>
            {[{t:"20%",l:"50%"},{t:"80%",l:"50%"},{t:"50%",l:"22%"},{t:"50%",l:"78%"},{t:"35%",l:"35%"},{t:"35%",l:"65%"},{t:"65%",l:"35%"},{t:"65%",l:"65%"}].map((p,i)=>(
              <div key={i} style={{position:"absolute",top:p.t,left:p.l,transform:"translate(-50%,-50%) rotate(45deg)",width:"clamp(4px,1vw,7px)",height:"clamp(4px,1vw,7px)",border:"1px solid rgba(201,162,39,.3)"}}/>
            ))}
          </div>
        </div>
      </div>
      {/* HOLD / CANCEL button */}
      <button onClick={onToggleHold} disabled={!canHold}
        aria-pressed={isHeld}
        aria-label={card ? `${isHeld?"Cancel":"Hold"} ${RANK_LABELS[card.rank]} of ${card.suit}` : "Hold"}
        style={{
          marginTop:"8px", width:"clamp(58px,12vw,110px)",
          padding:"clamp(5px,1vw,9px) 0", borderRadius:"6px",
          border: isHeld ? "2px solid #c9a227" : "1px solid #4a4a6e",
          background: isHeld ? "linear-gradient(180deg,#5a4a10,#3a3010)"
            : canHold ? "linear-gradient(180deg,#3a3a5e,#2a2a4e)"
            : "linear-gradient(180deg,#2a2a3e,#1a1a2e)",
          color: isHeld ? "#ffd60a" : canHold ? "#c8c8e8" : "#444458",
          fontSize:"clamp(.52rem,1.1vw,.7rem)", fontWeight:700,
          fontFamily:"'Fira Code',monospace", textTransform:"uppercase",
          letterSpacing:".1em", cursor: canHold?"pointer":"default",
          boxShadow: isHeld ? "0 0 10px rgba(201,162,39,.3),0 2px 0 #1a1a0e"
            : canHold ? "0 2px 0 #1a1a2e,0 3px 6px rgba(0,0,0,.2)" : "none",
          transition:"all .1s", opacity: canHold ? 1 : .35,
        }}
      >{isHeld ? "CANCEL" : "HOLD"}</button>
    </div>
  );
}

export default function VideoPokerMachine() {
  const [ptId, setPtId] = useState("jacks-9-6");
  const [phase, setPhase] = useState("idle");
  const [hand, setHand] = useState([null,null,null,null,null]);
  const [held, setHeld] = useState([false,false,false,false,false]);
  const [fd, setFd] = useState([true,true,true,true,true]);
  const [coins, setCoins] = useState(5);
  const [credits, setCredits] = useState(100);
  const [result, setResult] = useState("");
  const [winAmt, setWinAmt] = useState(0);
  const [winRow, setWinRow] = useState(-1);
  const [deck, setDeck] = useState([]);
  const [played, setPlayed] = useState(0);
  const [won, setWon] = useState(0);
  const ref = useRef(null);

  const pt = PAY_TABLES[ptId];
  const canBet = phase==="idle"||phase==="result";
  const canHold = phase==="dealt";

  const deal = useCallback(() => {
    if (credits < coins) return;
    setCredits(c=>c-coins); setResult(""); setWinAmt(0); setWinRow(-1);
    setHeld([false,false,false,false,false]);
    const nd = shuffle(createDeck());
    setFd([true,true,true,true,true]); setHand(nd.slice(0,5)); setDeck(nd.slice(5));
    for (let i=0;i<5;i++) ((idx)=>setTimeout(()=>setFd(p=>{const n=[...p];n[idx]=false;return n}),(idx+1)*100))(i);
    setTimeout(()=>{setFd([false,false,false,false,false]);setPhase("dealt");},550);
    setPhase("dealing");
  },[credits,coins]);

  const draw = useCallback(() => {
    if (phase!=="dealt") return;
    setPhase("drawing"); setFd(held.map(h=>!h));
    setTimeout(()=>{
      const nh=[...hand]; let di=0;
      for (let i=0;i<5;i++) if (!held[i]) nh[i]=deck[di++];
      setHand(nh);
      const dl=[]; let d=0;
      for (let i=0;i<5;i++) if (!held[i]){dl.push({x:i,d:d*100});d++;}
      dl.forEach(({x,d:delay})=>setTimeout(()=>setFd(p=>{const n=[...p];n[x]=false;return n}),delay+200));
      setTimeout(()=>{
        setFd([false,false,false,false,false]);
        const r=evaluateHand(nh,ptId);
        if (r) {
          const ri=pt.hands.findIndex(h=>h.name===r);
          const pay=ri>=0?pt.hands[ri].pay[coins-1]:0;
          setResult(`${r} — ${pay} Credits`); setWinAmt(pay); setWinRow(ri);
          setCredits(c=>c+pay); setWon(w=>w+1);
        } else { setResult("No Win"); setWinAmt(0); setWinRow(-1); }
        setPlayed(h=>h+1); setPhase("result");
      },dl.length*100+400);
    },400);
  },[phase,hand,held,deck,coins,ptId,pt]);

  const toggle = i => { if (canHold) setHeld(p=>{const n=[...p];n[i]=!n[i];return n;}); };
  const go = () => { if (phase==="dealt") draw(); else if (canBet) deal(); };
  const anyHeld = held.some(h=>h);

  const onKey = e => {
    if (!canHold) return;
    const btns = ref.current?.querySelectorAll('[aria-pressed]');
    if (!btns) return;
    const i = Array.from(btns).indexOf(document.activeElement);
    if (i===-1) return;
    if (e.key==="ArrowRight"||e.key==="ArrowDown"){e.preventDefault();btns[(i+1)%5]?.focus();}
    if (e.key==="ArrowLeft"||e.key==="ArrowUp"){e.preventDefault();btns[(i+4)%5]?.focus();}
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#080812 0%,#121224 40%,#080812 100%)",display:"flex",flexDirection:"column",alignItems:"center",padding:"12px 8px",fontFamily:"'Fira Code','JetBrains Mono',monospace",gap:"12px"}}>
      {/* Variant tabs */}
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",justifyContent:"center"}}>
        {Object.entries(PAY_TABLES).map(([id,t])=>(
          <button key={id} onClick={()=>{if(canBet){setPtId(id);setPhase("idle");setHand([null,null,null,null,null]);setFd([true,true,true,true,true]);setResult("");setWinRow(-1);setCredits(100);setPlayed(0);setWon(0);}}}
            style={{padding:"5px 12px",borderRadius:"6px",border:id===ptId?"2px solid #c9a227":"1px solid #333358",background:id===ptId?"rgba(201,162,39,.12)":"rgba(20,20,40,.9)",color:id===ptId?"#ffd60a":"#6666aa",fontSize:".68rem",fontFamily:"inherit",cursor:canBet?"pointer":"default",opacity:canBet?1:.4,transition:"all .15s"}}>
            {t.name} {t.shortName}
          </button>
        ))}
      </div>

      {/* Cabinet */}
      <div style={{maxWidth:"740px",width:"100%",background:"linear-gradient(180deg,#1e1e3a 0%,#1a1a2e 8%,#151528 100%)",border:"2px solid #28284a",borderRadius:"14px",boxShadow:"0 0 0 1px #c9a227,0 12px 48px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.04)",padding:"clamp(10px,2.5vw,22px)",display:"flex",flexDirection:"column",gap:"10px"}}>

        {/* Pay table */}
        <div style={{background:"linear-gradient(180deg,#1a1a34,#20203a)",borderRadius:"8px",padding:"clamp(6px,1.5vw,12px)",border:"1px solid #28284a",boxShadow:"inset 0 2px 8px rgba(0,0,0,.3)",overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"clamp(.48rem,1.35vw,.75rem)",color:"#aab0d8"}}>
            <thead><tr>
              <th style={{textAlign:"left",padding:"2px 6px",color:"#5560a0",fontWeight:400,fontSize:".85em"}}>HAND</th>
              {[1,2,3,4,5].map(c=><th key={c} style={{textAlign:"center",padding:"2px 3px",minWidth:"36px",color:c===coins?"#ffd60a":"#5560a0",fontWeight:c===coins?700:400,background:c===coins?"rgba(201,162,39,.05)":"none",fontSize:".85em"}}>{c}</th>)}
            </tr></thead>
            <tbody>
              {pt.hands.map((h,i)=>{const w=winRow===i;return(
                <tr key={i} style={{background:w?"rgba(201,162,39,.18)":"transparent",transition:"background .3s"}}>
                  <td style={{padding:"2px 6px",whiteSpace:"nowrap",fontWeight:w?700:400,color:w?"#ffd60a":"#aab0d8",textShadow:w?"0 0 8px rgba(255,214,10,.4)":"none"}}>{h.name}</td>
                  {h.pay.map((p,j)=><td key={j} style={{textAlign:"center",padding:"2px 3px",fontWeight:(j+1===coins||w)?700:400,color:w&&j+1===coins?"#ffd60a":j+1===coins?"#dde0ff":"#6670a0",background:j+1===coins?"rgba(201,162,39,.03)":"none",textShadow:w&&j+1===coins?"0 0 6px rgba(255,214,10,.5)":"none"}}>{p}</td>)}
                </tr>
              );})}
            </tbody>
          </table>
          <div style={{marginTop:"5px",fontSize:".62rem",textAlign:"center",color:pt.returnPct>=100?"#4ade80":"#5560a0"}}>
            Return: {pt.returnPct}%{pt.returnPct>=100?" ✦ Player Advantage":""}
          </div>
        </div>

        {/* Cards + Hold buttons */}
        <div ref={ref} onKeyDown={onKey} style={{display:"flex",justifyContent:"center",gap:"clamp(3px,.9vw,8px)",padding:"2px 0"}}>
          {hand.map((c,i)=>(
            <CardSlot key={c?c.id+'-'+i:`e${i}`} card={c} isHeld={held[i]}
              isDimmed={canHold&&anyHeld&&!held[i]} isFaceDown={fd[i]}
              onToggleHold={()=>toggle(i)} canHold={canHold}/>
          ))}
        </div>

        {/* Result */}
        <div role="status" aria-live="polite" style={{textAlign:"center",minHeight:"30px",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {result&&<div style={{fontSize:"clamp(.8rem,2.2vw,1.2rem)",fontWeight:700,color:winAmt>0?"#ffd60a":"rgba(170,170,200,.3)",textShadow:winAmt>0?"0 0 16px rgba(255,214,10,.4)":"none",letterSpacing:".06em",animation:winAmt>0?"pop .3s ease-out":"none"}}>
            {winAmt>0?`━━  ${result}  ━━`:result}
          </div>}
        </div>

        {/* Controls */}
        <div style={{background:"rgba(0,0,0,.25)",borderRadius:"8px",padding:"clamp(8px,1.8vw,14px)",display:"flex",flexDirection:"column",gap:"8px"}}>
          <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>canBet&&setCoins(c=>c>=5?1:c+1)} disabled={!canBet} style={{...B,opacity:canBet?1:.35}}>BET ONE</button>
            <button onClick={()=>canBet&&setCoins(5)} disabled={!canBet} style={{...B,opacity:canBet?1:.35}}>BET MAX</button>
            <button onClick={go} disabled={phase==="dealing"||phase==="drawing"||credits<coins}
              style={{...B,...P,opacity:(phase==="dealing"||phase==="drawing"||credits<coins)?.4:1}}>
              {phase==="dealt"?"DRAW":"DEAL"}
            </button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"clamp(.58rem,1.3vw,.78rem)",color:"#4ade80",textShadow:"0 0 6px rgba(74,222,128,.2)",padding:"2px 4px",flexWrap:"wrap",gap:"4px"}}>
            <span>CREDITS {credits}</span><span>WON {won}/{played}</span><span>BET {coins}×$0.25 = ${(coins*.25).toFixed(2)}</span>
          </div>
          {coins<5&&<div style={{fontSize:".62rem",color:"#f87171",textAlign:"center",background:"rgba(248,113,113,.07)",padding:"3px 8px",borderRadius:"4px",border:"1px solid rgba(248,113,113,.12)"}}>
            ⚠ Royal Flush bonus requires max coins — return drops ~1.5%
          </div>}
          {credits<coins&&<div style={{textAlign:"center"}}>
            <button onClick={()=>{setCredits(100);setPlayed(0);setWon(0);setPhase("idle");setResult("");setWinAmt(0);setWinRow(-1);}}
              style={{...B,fontSize:".68rem",padding:"6px 16px"}}>INSERT CREDITS</button>
          </div>}
        </div>
      </div>

      {/* Training panel */}
      {phase==="result"&&<div style={{maxWidth:"740px",width:"100%",background:"#eeeff4",borderRadius:"8px",padding:"14px 18px",color:"#1a1a2e",fontFamily:"system-ui,-apple-system,sans-serif",fontSize:".8rem",lineHeight:1.5,borderLeft:"3px solid #c9a227"}}>
        <div style={{fontWeight:700,fontSize:".84rem",marginBottom:"6px"}}>Training Panel</div>
        <div style={{color:"#555",fontSize:".76rem"}}>
          Full build: optimal hold vs. your hold · EV comparison · per-hand mistake cost ·
          32-option analysis ranked by expected value · scrollable hand history with mistake filter
        </div>
      </div>}

      <style>{`
        @keyframes pop{0%{transform:scale(.92);opacity:.5}50%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
        @keyframes heldPop{0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}}
        button:focus-visible{outline:2px solid #ffd60a;outline-offset:2px}
        button:active:not(:disabled){transform:translateY(1px)}
      `}</style>
    </div>
  );
}

const B={background:"linear-gradient(180deg,#3a3a5e,#2a2a4e)",border:"1px solid #4a4a6e",borderRadius:"6px",color:"#e0e0ff",padding:"9px 18px",fontSize:".76rem",fontWeight:700,fontFamily:"'Fira Code','JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:".05em",cursor:"pointer",boxShadow:"0 3px 0 #1a1a2e,0 4px 8px rgba(0,0,0,.25)",transition:"transform .1s,box-shadow .1s,opacity .15s"};
const P={background:"linear-gradient(180deg,#c9a227,#a88520)",color:"#1a1a2e",fontSize:".95rem",padding:"11px 36px",boxShadow:"0 3px 0 #6b5510,0 0 16px rgba(201,162,39,.2),0 4px 8px rgba(0,0,0,.25)"};
