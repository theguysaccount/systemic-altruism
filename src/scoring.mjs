export const axes = {
  depth: {label:'Structural depth', question:'Does the mechanism change rules, incentives, power or institutions?', weight:30},
  reach: {label:'Institutional reach', question:'How widely can the documented mechanism influence a system?', weight:20},
  durability: {label:'Durability', question:'Could the change persist without continued delivery by the charity?', weight:20},
  scalability: {label:'Scalability', question:'Can the mechanism spread beyond its initial setting?', weight:15},
  additionality: {label:'Funding additionality', question:'Would another donation enable work that otherwise would not happen?', weight:10},
  agency: {label:'Community agency', question:'Do affected communities have documented decision-making power?', weight:5}
};
export const presets={
  balanced:{depth:30,reach:20,durability:20,scalability:15,additionality:10,agency:5},
  institutions:{depth:40,reach:25,durability:20,scalability:5,additionality:5,agency:5},
  community:{depth:20,reach:10,durability:20,scalability:10,additionality:10,agency:30},
  scale:{depth:20,reach:25,durability:15,scalability:25,additionality:10,agency:5}
};
export function assess(scores,weights=presets.balanced){
  const total=Object.keys(axes).reduce((s,k)=>s+Math.max(0,Number(weights[k])||0),0);
  if(!total) return {lower:0,upper:100,coverage:0,known:0,total:0};
  let points=0,known=0;
  for(const key of Object.keys(axes)){
    const w=Math.max(0,Number(weights[key])||0), value=scores[key];
    if(value!==null&&value!==undefined){
      if(!Number.isFinite(value)||value<0||value>4) throw new Error(`Invalid ${key} score`);
      points+=w*value/4;known+=w;
    }
  }
  return {lower:100*points/total,upper:100*(points+total-known)/total,coverage:100*known/total,known,total};
}
export function ordered(charities,weights){
  return [...charities].sort((a,b)=>assess(b.scores,weights).lower-assess(a.scores,weights).lower || a.name.localeCompare(b.name));
}
