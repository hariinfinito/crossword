#!/usr/bin/env node
/*
 * Automatic crossword generator.
 * Greedy placement: start with the longest word, then repeatedly place a word
 * so it crosses an existing letter. Produces a connected, fully-interlocking
 * grid where EVERY crossing is guaranteed consistent (we only place a word if
 * all overlaps match and it doesn't illegally touch other words).
 *
 * Output: puzzle.json { size, grid (rows of chars, '.'=block), entries[] }.
 */
const fs = require('fs');

// Curated intermediate-difficulty word list with clues.
const WORDS = [
  ["PENDULUM", "Swinging weight that keeps a clock's time"],
  ["TELESCOPE", "Instrument for viewing distant stars"],
  ["VELVET", "Soft fabric with a dense pile"],
  ["MOSAIC", "Picture made from small colored tiles"],
  ["GAMBIT", "Chess opening that sacrifices a pawn"],
  ["NEBULA", "Cloud of gas and dust in space"],
  ["TANGENT", "Line touching a curve at a single point"],
  ["OCTAVE", "Musical interval of eight notes"],
  ["ENIGMA", "Baffling puzzle or mystery"],
  ["ESTATE", "Large property with a grand house"],
  ["TREATY", "Formal pact between nations"],
  ["ORBIT", "A planet's path around the sun"],
  ["AROMA", "Pleasant smell from cooking"],
  ["ICON", "Small image you click on a screen"],
  ["SPHINX", "Riddling creature of Greek myth"],
  ["ANVIL", "Blacksmith's heavy iron block"],
  ["CEDAR", "Aromatic evergreen used in chests"],
  ["MOTIF", "Recurring theme in a design"],
  ["SALSA", "Spicy dip or a lively dance"],
  ["PROBE", "Craft sent to explore a planet"],
  ["HABIT", "Routine that is hard to break"],
  ["IGLOO", "Dome-shaped snow shelter"],
  ["NYLON", "Synthetic fiber used in stockings"],
  ["LATTICE", "Crisscross framework of strips"],
  ["MARBLE", "Veined stone used for sculpture"],
  ["COMPASS", "Tool that always points north"],
  ["FRESCO", "Painting done on wet plaster"],
  ["QUARTZ", "Common crystal in many watches"],
  ["EMBER", "Glowing remnant of a fire"],
  ["VOYAGE", "A long journey by sea"],
];

const SIZE = 15;

function makeGrid(){ return Array.from({length:SIZE},()=>Array(SIZE).fill(null)); }

function canPlace(grid, word, r, c, dir){
  const dr = dir==="down"?1:0, dc = dir==="across"?1:0;
  const endR = r + dr*(word.length-1), endC = c + dc*(word.length-1);
  if(r<0||c<0||endR>=SIZE||endC>=SIZE) return false;
  // cell before start and after end must be empty (word boundary)
  const br=r-dr, bc=c-dc, ar=endR+dr, ac=endC+dc;
  if(inBounds(br,bc)&&grid[br][bc]!==null) return false;
  if(inBounds(ar,ac)&&grid[ar][ac]!==null) return false;
  let crossings=0;
  for(let i=0;i<word.length;i++){
    const rr=r+dr*i, cc=c+dc*i;
    const cur=grid[rr][cc];
    if(cur!==null){
      if(cur!==word[i]) return false;
      crossings++;
    } else {
      // the two perpendicular neighbors must be empty (avoid accidental parallel words)
      if(dir==="across"){
        if(inBounds(rr-1,cc)&&grid[rr-1][cc]!==null) return false;
        if(inBounds(rr+1,cc)&&grid[rr+1][cc]!==null) return false;
      } else {
        if(inBounds(rr,cc-1)&&grid[rr][cc-1]!==null) return false;
        if(inBounds(rr,cc+1)&&grid[rr][cc+1]!==null) return false;
      }
    }
  }
  return crossings>0; // must cross at least one existing letter
}
function inBounds(r,c){ return r>=0&&c>=0&&r<SIZE&&c<SIZE; }

function place(grid, word, r, c, dir){
  const dr=dir==="down"?1:0, dc=dir==="across"?1:0;
  for(let i=0;i<word.length;i++) grid[r+dr*i][c+dc*i]=word[i];
}

function generate(seed){
  // deterministic shuffle
  let s=seed;
  const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
  const words=[...WORDS].sort((a,b)=>b[0].length-a[0].length);
  const grid=makeGrid();
  const placed=[];
  // place first word centered horizontally
  const first=words[0][0];
  const r0=Math.floor(SIZE/2), c0=Math.floor((SIZE-first.length)/2);
  place(grid,first,r0,c0,"across");
  placed.push({word:first,r:r0,c:c0,dir:"across"});
  const remaining=words.slice(1);
  let progress=true;
  while(progress){
    progress=false;
    for(let wi=0; wi<remaining.length; wi++){
      const word=remaining[wi][0];
      let best=null;
      // try to cross with each placed word's letters
      for(let i=0;i<word.length;i++){
        for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++){
          if(grid[r][c]!==word[i]) continue;
          // try across placement so that word[i] lands at (r,c)
          for(const dir of ["across","down"]){
            const dr=dir==="down"?1:0, dc=dir==="across"?1:0;
            const sr=r-dr*i, sc=c-dc*i;
            if(canPlace(grid,word,sr,sc,dir)){
              const score=rnd(); // random tie-break for variety
              if(!best||score>best.score) best={sr,sc,dir,score};
            }
          }
        }
      }
      if(best){
        place(grid,word,best.sr,best.sc,best.dir);
        placed.push({word,r:best.sr,c:best.sc,dir:best.dir});
        remaining.splice(wi,1); wi--;
        progress=true;
      }
    }
  }
  return {grid,placed,leftover:remaining.map(w=>w[0])};
}

// Try several seeds, keep the one that places the most words in a tight bbox.
let bestRun=null;
for(let seed=1; seed<=400; seed++){
  const run=generate(seed);
  // bounding box
  let minR=SIZE,maxR=0,minC=SIZE,maxC=0,filled=0;
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++) if(run.grid[r][c]!==null){filled++;minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);}
  const placedCount=run.placed.length;
  const area=(maxR-minR+1)*(maxC-minC+1);
  const density=filled/area;
  const score=placedCount*100 + density*50;
  if(!bestRun||score>bestRun.score) bestRun={...run,minR,maxR,minC,maxC,score,placedCount,density};
}

const {grid,minR,maxR,minC,maxC,placed,leftover,placedCount}=bestRun;
// crop
const rows=[];
for(let r=minR;r<=maxR;r++){
  let line="";
  for(let c=minC;c<=maxC;c++) line += grid[r][c]===null?".":grid[r][c];
  rows.push(line);
}

// clue lookup
const clueOf={};
for(const [w,cl] of WORDS) clueOf[w]=cl;

// number + extract entries from cropped grid (source of truth)
const H=rows.length, W=rows[0].length;
const isBlock=(r,c)=> r<0||c<0||r>=H||c>=W||rows[r][c]===".";
const entries=[]; let num=0;
for(let r=0;r<H;r++)for(let c=0;c<W;c++){
  if(isBlock(r,c)) continue;
  const sA=isBlock(r,c-1)&&!isBlock(r,c+1);
  const sD=isBlock(r-1,c)&&!isBlock(r+1,c);
  if(sA||sD) num++;
  if(sA){ let w="",cc=c; while(!isBlock(r,cc)){w+=rows[r][cc];cc++;} entries.push({num,dir:"across",row:r,col:c,len:w.length,answer:w,clue:clueOf[w]||("(word: "+w+")")}); }
  if(sD){ let w="",rr=r; while(!isBlock(rr,c)){w+=rows[rr][c];rr++;} entries.push({num,dir:"down",row:r,col:c,len:w.length,answer:w,clue:clueOf[w]||("(word: "+w+")")}); }
}

// verify no entry lacks a real clue (all placed words come from WORDS, so fine)
const unknown=entries.filter(e=>e.clue.startsWith("(word:"));
console.log(`Cropped grid ${W}x${H}. Placed ${placedCount}/${WORDS.length} words. ${entries.length} entries. Leftover: ${leftover.join(", ")||"none"}`);
rows.forEach(l=>console.log("  "+l));
if(unknown.length){ console.error("Entries without clues (unexpected fragments):"); unknown.forEach(e=>console.error("  "+e.answer)); process.exit(1); }

fs.writeFileSync("puzzle.json", JSON.stringify({size:{H,W},grid:rows,entries},null,2));
console.log(`\nOK. Wrote puzzle.json (${entries.length} clues).`);
