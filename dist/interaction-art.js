const ink = '#445263';
const paths = new Map();
function line(ctx, data, color=ink, width=3) {
  if (!paths.has(data)) paths.set(data,new Path2D(data));
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.stroke(paths.get(data));
}
function shape(ctx,data,fill,stroke=ink) {
  if (!paths.has(data)) paths.set(data,new Path2D(data));
  const p=paths.get(data);
  ctx.fillStyle=fill;
  ctx.fill(p);
  if(stroke) {
    ctx.strokeStyle=stroke;
    ctx.lineWidth=3;
    ctx.stroke(p);
  }
}
function circle(ctx,x,y,r,fill,stroke) {
  ctx.beginPath(); ctx.arc(x,y,r,0,2*Math.PI);
  ctx.fillStyle=fill; ctx.fill();
  if(stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=3; ctx.stroke(); }
}

const drawings = {
  yarn(ctx) {
    circle(ctx,0,0,21,'#e8a4c5',ink);
    line(ctx,'M-19 7Q-2-6 16-13 M-13 15Q5 1 20-1 M0 20Q9 10 19 8 M-50 18Q-29 28-31 14Q-27 3-20 6', '#a85d94',3);
  },
  ball(ctx) {
    circle(ctx,0,0,20,'#ffce83',ink);
    line(ctx,'M-15-13Q-5 2-16 12 M13-14Q5 0 16 11 M-16 12Q0 1 16 11','#ba754d',3);
  },
  watering(ctx) {
    shape(ctx,'M-21-5-35-12-45-16-47-9-32-3-23 13Z','#c4d8fa');
    ctx.beginPath();ctx.roundRect(-24,-14,47,34,7);
    ctx.fillStyle='#72abce';ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke();
    line(ctx,'M18-9C44-22 43 9 23 10',ink,4);
    line(ctx,'M-17-14Q0-25 17-14','#536783',4);
  },
  stream(ctx,e) {
    const dx=e.to.x-e.x,dy=e.to.y-e.y;
    for(let i=0;i<13;i++) {
      const p=(e.time*2.15+i/13)%1;
      const x=dx*p+Math.sin(i*8)*p*14;
      const y=dy*p-(e.arch??14)*4*p*(1-p)+Math.cos(i)*p*11;
      circle(ctx,x,y,3+p*3,i%2?'#83cce9':'#bdeaf9','#5e9fca');
    }
  },
  track(ctx) {
    circle(ctx,0,5,12,'#bca2cc');
    for (const [x,y,r] of [[-12,-8,4],[0,-12,5],[12,-8,4]]) circle(ctx,x,y,r,'#bca2cc');
  },
  star(ctx) {
    shape(ctx,'M0-25 7-9 24-7 12 4 15 21 0 13-15 21-12 4-24-7-7-9Z','#ffe08b','#9e7941');
  },
  spark(ctx) {
    shape(ctx,'M0-18Q4-3 17 0Q3 4 0 18Q-4 4-17 0Q-4-3 0-18Z','#ffe598','#bc9153');
  },
  puff(ctx) {
    for(const [x,y,r] of [[-20,6,13],[-5,-2,17],[17,6,13]]) circle(ctx,x,y,r,'#e8f0ff','#b3bfd9');
  },
  bubble(ctx) {
    circle(ctx,0,0,28,'#c2edf49e','#63b5ce');
    line(ctx,'M-18-3Q-16-14-6-16','#fff',4);
    circle(ctx,16,12,3.7,'#f2fdff');
  },
  umbrella(ctx) {
    line(ctx,'M0-28V38Q1 52 11 48',ink,5);
    shape(ctx,'M-66-4Q-58-47 0-47Q55-47 66-4Q43-20 22-4Q0-20-22-4Q-44-20-66-4Z','#f4a9c4');
    line(ctx,'M0-46Q-18-33-22-4 M0-46Q18-33 22-4','#ba739b',3);
  },
  rope(ctx,e) {
    const x=e.to.x-e.x,y=e.to.y-e.y;
    ctx.beginPath();
    ctx.moveTo(0,0);ctx.quadraticCurveTo(x*.58,y*.42+21,x,y);
    ctx.strokeStyle='#b58755';ctx.lineWidth=5;ctx.stroke();
  },
  wind(ctx,e) {
    ctx.translate(18*Math.sin(e.time*6),0);
    line(ctx,'M-52-21H-6Q10-21 10-32Q10-41-1-41 M-39 0H39Q55 0 55-12Q55-20 44-20 M-67 22H-11Q2 22 2 31Q2 42-11 38','#8ab9d7',5);
  },
  cookie(ctx) {
    circle(ctx,0,0,15,'#e9ba83','#986b55');
    for (const [x,y] of [[-7,-6],[6,-7],[-4,5],[7,5]]) circle(ctx,x,y,2.8,'#96614d');
  },
  blossom(ctx) {
    for(let i=0;i<5;i++) {
      const a=i*2*Math.PI/5; circle(ctx,9*Math.cos(a),9*Math.sin(a),7.5,'#efa8c8','#946e98');
    }
    circle(ctx,0,0,6,'#ffda83','#947044');
  },
  door(ctx,e) {
    const width=66*e.open;
    ctx.save();
    ctx.beginPath();ctx.moveTo(-66,0);ctx.lineTo(-66,-129);
    ctx.quadraticCurveTo(0,-227,66,-129);ctx.lineTo(66,0);ctx.closePath();ctx.clip();
    ctx.fillStyle='#6b5769';ctx.fillRect(-width,-205,2*width,205);
    ctx.fillStyle='#ffd989';ctx.fillRect(-width*.42,-190,width*.84,190);
    ctx.restore();
  },
  pumpkin(ctx) {
    shape(ctx,'M-53-19-36-49-18-19Z M23-19 43-49 61-19Z M-13 8 0-15 14 8Z M-53 20Q0 48 57 20Q0 77-53 20Z','#ffd66c','#c98a46');
  },
  burst(ctx) {
    ctx.strokeStyle='#75b6db';ctx.lineWidth=5;
    for(let i=0;i<7;i++) {
      const a=i*2*Math.PI/7;
      ctx.beginPath();ctx.moveTo(15*Math.cos(a),15*Math.sin(a));ctx.lineTo(32*Math.cos(a),32*Math.sin(a));ctx.stroke();
    }
  },
  flash(ctx) {
    ctx.fillStyle='#fffdf3';ctx.fillRect(-800,-800,2600,2500);
  },
  photo(ctx) {
    line(ctx,'M184 390V298H285 M715 298H816V390 M816 799V866H715 M285 866H184V799','#fff0bf',11);
  }
};

export function drawInteractionProps(ctx, props, after = false) {
  for (const item of props) {
    if (Boolean(item.after) !== after || item.opacity === 0 || item.scale === 0 || item.open === 0) continue;
    ctx.save();
    ctx.globalAlpha *= item.opacity ?? 1;
    ctx.translate(item.x,item.y);
    ctx.rotate(item.angle ?? 0);
    const scale=item.scale ?? 1;
    ctx.scale(scale,scale);
    ctx.lineCap='round';
    ctx.lineJoin='round';
    drawings[item.kind](ctx,item);
    ctx.restore();
  }
}
