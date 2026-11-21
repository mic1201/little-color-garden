const start = 1.18;
const duration = 6.4;
const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a,b,t) => a + (b-a)*t;
const smooth = n => { const p = clamp(n); return p*p*(3-2*p); };
const advance = (t,a,b) => smooth((t-a)/(b-a));
const wave = (t,n=1) => Math.sin(t*n*2*Math.PI);
const arc = p => 4*p*(1-p);
const pulse = (t,a,b,c,d) => advance(t,a,b)*(1-advance(t,c,d));
const phase = t => Math.max(0, t-start) % duration;
const point = (x,y) => ({x,y});
const move = (a,b,p) => point(mix(a.x,b.x,p),mix(a.y,b.y,p));
const feet = (x,y,options={}) => ({x,y,size:.58,paperSize:true,face:1,gait:'walk',stride:0,...options});
const prop = (kind,x,y,options={}) => ({kind,x,y,...options});
const scene = (pose, ...props) => ({pose,props});
const arm = (pose, left, right) => ({...pose, leftArm:left, rightArm:right});
const hop = (pose,p,height) => ({...pose,y:pose.y-height*arc(p),gait:'hop'});
const shine = (x,y,opacity) => prop('spark',x,y,{opacity});

function hand(pose, side) {
  const angle = side === 'left' ? pose.leftArm : pose.rightArm;
  const x = (side === 'left' ? 88 : 152) - 46*Math.sin(angle);
  const y = 151 + 46*Math.cos(angle);
  const xx = (x-122)*pose.face*pose.size, yy = (y-280)*pose.size;
  const lean = pose.lean ?? 0;
  return point(pose.x+xx*Math.cos(lean)-yy*Math.sin(lean),pose.y+xx*Math.sin(lean)+yy*Math.cos(lean));
}

const butterflyRest = point(500,635), butterflyPerch = point(690,548);
const parrotRest = point(500,726), parrotPerch = point(759,536);
const landing = t => pulse(t,.35,1.85,3.75,5.48);
function flyToHand(t, rest, perch, size, angle=0) {
  const p = landing(t);
  return {dx:(perch.x-rest.x)*p,dy:(perch.y-rest.y)*p-85*arc(p),
    angle:angle*p,scaleX:mix(1,size,p),scaleY:mix(1,size,p),pivot:[rest.x,rest.y]};
}

const ballGame = ({y,home,contact,catchAt,kind='ball'}) => (t,at) => {
  const early = advance(t,.1,.88), out = advance(t,.9,catchAt);
  const returning = advance(t,catchAt+.09,4.32);
  const arrive = advance(t,4.32,5.08);
  const animal = at(...contact);
  const facing = home > contact[0] ? -1 : 1;
  const handball = point(home+42*facing,y);
  const kick = point(animal.x-14,animal.y);
  const ball = move(move(handball,kick,out),handball,returning);
  const x = mix(home+35,home,early)+18*arc(returning)-18*arrive;
  const actor = arm(feet(x,y+(kind==='yarn'?31:47),{face:facing,stride:.8*wave(t,3)*arc(early)}),
    .48 + 1.13*pulse(t,.65,1.0,1.1,1.4),-.6);
  return scene(actor,prop(kind,ball.x,ball.y,{angle:t*4,scale:kind==='yarn'?1:1.18}),
    shine(kick.x,kick.y-26,pulse(t,catchAt-.02,catchAt+.14,catchAt+.24,catchAt+.5)));
};

export const pictureInteractions = {
  'cat-clean': ballGame({y:752,home:185,contact:[363,747],catchAt:2.18,kind:'yarn'}),
  'butterfly-clean': t => {
    const pose = arm(feet(744,628,{face:1,lean:-.12*landing(t)}),1.4,-.15);
    return scene(pose,shine(butterflyPerch.x,butterflyPerch.y-39,pulse(t,1.85,2.25,3.1,3.5)));
  },
  'flower-clean': (t,at) => {
    const pouring = pulse(t,1.12,1.55,3.08,3.5);
    const pose = arm(feet(mix(780,633,pulse(t,.08,.9,4.9,6.2)),755,{lean:-.18*pouring,stride:.54*wave(t,2.9)*arc(advance(t,.08,.9))}),1.25,-.44);
    const from = hand(pose,'left');
    const plant = at(502,725);
    return scene(pose,prop('watering',from.x,from.y,{angle:-.72*pouring}),
      prop('stream',from.x-35,from.y-9,{to:plant,opacity:pouring,time:t}),
      shine(500,250,pulse(t,2.82,3.43,4.46,5.28)));
  },
  'dinosaur-clean': (t,at) => {
    const progress = advance(t,.25,4.8);
    const foot = at(684,774);
    const steps = [832,767,702,637,572,507,442,377];
    const pose = feet(mix(850,foot.x-95,progress),805-23*Math.abs(wave(t,2.0)),{face:-1,stride:.99*wave(t,2.0)});
    return scene(pose,...steps.map((x,i) => prop('track',x,806+(i%2)*21,{opacity:pulse(t,i*.34,i*.34+.3,5.3,6.3),angle:-.9,scale:1+i*.055})));
  },
  'rainbow-clean': t => {
    const climb = advance(t,.12,2.12), slide = advance(t,2.35,4.22), land = advance(t,4.22,4.95);
    const left = Math.PI-climb*Math.PI/2;
    const theta = mix(left,0,slide);
    const x = 500 + 286*Math.cos(theta) + 19*land;
    const y = 503 - 286*Math.sin(theta) + 82*land - 62*arc(land);
    const pose = feet(x,y,{face:1,mounted:.86*slide*(1-land),lean:.36*slide*(1-land),gait:slide && !land?'ride':'climb',
      climb:climb<1?.85:0,stride:.75*wave(t,2.1)*(1-slide)});
    return scene(pose,shine(x-37,y+24,pulse(t,2.36,3,4.65,5.2)),
      prop('puff',818,588,{opacity:pulse(t,4.22,4.45,4.62,5.18),scale:1.24}));
  },
  'rocket-clean': (t,at) => {
    const jump = advance(t,2.88,4.52), release = pulse(t,2.22,2.66,5.21,5.93);
    const pose = arm(hop(feet(769,731,{face:-1,lean:-.14*arc(jump)}),jump,116),.7,-1.64*arc(jump));
    const catchHand = hand(pose,'right'), star = at(762,262,1);
    const falling = advance(t,2.68,3.68), caught = advance(t,3.49,3.87);
    const starAt = move(move(star,point(811,566),falling),catchHand,caught);
    return scene(pose,prop('star',starAt.x,starAt.y,{angle:t*1.7,opacity:release}),
      ...[.45,.9,1.35].map((beat,i) => prop('spark',715+i*26,572,{opacity:pulse(t,beat,beat+.17,beat+.28,beat+.49)})));
  },
  'whale-clean': (t,at) => {
    const spout = at(411,278);
    const rise = advance(t,.86,2.21), down = advance(t,2.21,4.91);
    const height=169*rise*(1-down);
    const x=spout.x+154*down;
    const pose=feet(x,spout.y-height+178*down+68*(1-rise),{gait:'ride',mounted:.83*rise*(1-down),wave:.81*rise*(1-down)});
    return scene(pose,
      prop('stream',spout.x,spout.y,{to:point(spout.x,spout.y-height),time:t,opacity:pulse(t,.78,1.22,2.06,2.44)}),
      prop('bubble',x,pose.y+21,{scale:1.55,opacity:pulse(t,1.9,2.43,4.53,5.18)}));
  },
  'elephant-clean': (t,at) => {
    const open = pulse(t,.74,1.22,4.1,4.73), spray = pulse(t,1.13,1.67,3.47,4.2);
    const pose = arm(feet(702 + 29*pulse(t,4.1,4.56,5.03,5.8),761,{face:-1,crouch:.72*open,lean:.12*open}),
      .36,-.32-1.4*open);
    const palm = hand(pose,'right');
    const trunk = at(474,609);
    return scene(pose,prop('stream',trunk.x,trunk.y,{to:point(palm.x,palm.y-56),time:t,opacity:spray,arch:125}),
      prop('umbrella',palm.x,palm.y-28,{scale:open,opacity:open}));
  },
  'triceratops-v4-clean': ballGame({y:596,home:108,contact:[217,529],catchAt:2.48}),
  'princess-dress-clean': (t,at) => {
    const dance = advance(t,.62,4.24), handhold = at(605,559);
    const orbit = Math.PI*2*dance;
    const bow = pulse(t,4.25,4.64,4.87,5.36);
    const pose = arm(feet(handhold.x+53*Math.cos(orbit),handhold.y+67+25*Math.sin(orbit),{face:dance>.25&&dance<.75?1:-1,
      lean:.5*bow+.23*Math.sin(orbit),stride:.7*wave(t,2.7)*arc(dance),crouch:1.2*bow}),.65,-1.57);
    return scene(pose,shine(handhold.x+19,handhold.y-22,pulse(t,1.05,1.45,3.57,4.16)));
  },
  'princess-castle-clean': t => {
    const walk=advance(t,.12,1.22), enter=advance(t,2.48,4.12);
    const door=pulse(t,1.75,2.42,4.51,5.72);
    const pose=arm(feet(mix(mix(671,548,walk),500,enter),mix(824,752,enter),{face:-1,
      stride:.66*wave(t,3)*Math.max(arc(walk),arc(enter)),opacity:1-advance(t,3.12,4.12)}),.45,-.42-1.68*pulse(t,1.2,1.42,1.65,1.82));
    return scene(pose,prop('door',500,780,{open:door}),
      shine(568,76-47*advance(t,3.5,4.5),pulse(t,3.45,3.94,5.68,6.35)),
      shine(534,682,pulse(t,1.34,1.52,1.65,1.86)));
  },
  sailboat: (t,at) => {
    const deck=at(631,606);
    const board=advance(t,.25,1.85);
    const pull=pulse(t,1.87,2.3,3.87,4.7);
    const pose=arm(hop(feet(mix(825,deck.x,board),mix(771,deck.y,board),{face:1,stride:.65*arc(board),lean:.18*pull}),board,100),1.58-.65*pull,-1.57+.48*pull);
    const palm=hand(pose,'left'), mast=at(510,382);
    return scene(pose,prop('rope',palm.x,palm.y,{to:mast,opacity:pull}),prop('wind',728,397,{opacity:pull,time:t}));
  },
  'parrot-cute-clean': t => {
    const hold=landing(t);
    const pose=arm(feet(820,610,{lean:-.17*hold}),1.7,-.2);
    return scene(pose,shine(parrotPerch.x-36,parrotPerch.y-106,pulse(t,1.62,1.91,3.38,3.64)));
  },
  'rabbit-garden-v2-clean': t => {
    const pull=pulse(t,1.02,1.77,2.45,3.0);
    const topple=pulse(t,3.16,3.84,4.34,5.5);
    const x=mix(880,803,advance(t,.15,1.02))+50*topple;
    const pose=arm(feet(x,778+21*topple,{lean:.64*topple-.33*pull,crouch:1.33*pull+1.7*topple,stride:.65*wave(t,3)*arc(advance(t,.15,1.02))}),1.45+.3*pull,-1.05*pull);
    return scene(pose,shine(750,565,pulse(t,1.6,1.8,2.05,2.4)));
  },
  'dino-picnic-clean': (t,at) => {
    const grab=advance(t,1.1,1.85), serve=advance(t,2.64,3.83);
    const sit=advance(t,1.64,2.43);
    const mouth=at(366,426);
    const pose=arm(feet(mix(191,317,grab),mix(767,778,sit),{mounted:.95*sit,crouch:1.1*sit,
      stride:.63*wave(t,2.8)*arc(grab),lean:-.12*serve}),1.13,-1.39*serve);
    const pos=move(move(point(201,651),hand(pose,'right'),grab),mouth,serve);
    return scene(pose,prop('cookie',pos.x,pos.y,{opacity:pulse(t,1.08,1.54,3.79,4.04)}),
      shine(mouth.x,mouth.y-53,pulse(t,3.85,4.14,4.48,4.89)));
  },
  'castle-garden-clean': t => {
    const run=advance(t,.32,4.64);
    const x=500+54*wave(run,1.54), y=mix(833,698,run)-31*Math.abs(wave(run,3.6));
    const pose=feet(x,y,{size:mix(.66,.49,run),stride:.86*wave(t,2.8)*arc(run),gait:'hop'});
    return scene(pose,shine(500+48*wave(run+.13,1.54),y-59,pulse(t,.18,.53,4.96,5.57)),
      ...[[331,790],[656,769],[367,739],[620,719],[405,701],[583,688]].map(([x,y],i) =>
        prop('blossom',x,y,{scale:pulse(t,1+i*.59,1.3+i*.59,5.26,6.28)})));
  },
  'halloween-photo-v4-clean': t => {
    const enter=advance(t,.25,2.07);
    const pose=feet(mix(880,477,enter),814,{face:enter>.97?1:-1, wave:pulse(t,2.13,2.52,4.61,5.12),stride:wave(t,3.2)*arc(enter)});
    const flash=pulse(t,3.48,3.56,3.6,3.94);
    return scene(pose,prop('pumpkin',789,724,{opacity:pulse(t,2.44,2.9,5.55,6.27)}),
      prop('flash',0,0,{opacity:flash,after:true}),prop('photo',0,0,{opacity:pulse(t,3.62,3.96,5.47,6.34),after:true}));
  },
  'island-dino-clean': (t,at) => {
    const pop=advance(t,2.67,3.68);
    const pose=arm(hop(feet(mix(165,265,advance(t,.17,2.62)),705,{face:-1,stride:.68*wave(t,2.8)*arc(advance(t,.17,2.62))}),pop,143),.85,-1.79*arc(pop));
    const lip=at(325,440);
    const drift=advance(t,.79,3.17);
    const bubble=move(lip,hand(pose,'right'),drift);
    return scene(pose,prop('bubble',bubble.x,bubble.y,{scale:1.5,opacity:pulse(t,.8,1.4,3.14,3.26)}),
      prop('burst',bubble.x,bubble.y,{opacity:pulse(t,3.13,3.27,3.43,3.68),scale:1.1}));
  },
  'island-turtle-clean': t => {
    const near=pulse(t,.14,1.62,3.02,4.83);
    const retreat=advance(t,2.65,3.46);
    const pose=feet(mix(145,270,near),747,{face:retreat>.2? -1:1,lean:-.27*near*(1-retreat),
      stride:.7*wave(t,3)*arc(near)});
    return scene(pose,shine(521,356,pulse(t,3.26,3.6,3.91,4.21)));
  }
};

export function pictureInteraction(pattern, time, parts, transformSticker) {
  const make = pictureInteractions[pattern];
  if (!make) return;
  const at = (x,y,index=0) => transformSticker(parts[index] ?? parts[0],{x,y},time);
  const elapsed = phase(time);
  const frame = make(elapsed, at);
  if (elapsed > 5.62) {
    const reset = advance(elapsed,5.62,duration);
    const pose = frame.pose;
    const home = make(0, at).pose;
    Object.assign(pose,move(pose,home,reset));
    pose.stride = mix(pose.stride,home.stride,reset) + .55*wave(elapsed,3.1)*arc(reset);
    pose.lean = mix(pose.lean ?? 0,home.lean ?? 0,reset);
    pose.size = mix(pose.size,home.size,reset);
    pose.opacity = mix(pose.opacity ?? 1,home.opacity ?? 1,reset);
  }
  return time < start ? {...frame, props:[]} : frame;
}

// Shared timing keeps the painted characters and the avatar on the same beats.
export const interactionArtwork = {
  'cat-clean': {time:t => clamp((t-1.25)/1.36)*1.18+advance(t,2.4,4.18)*2.97},
  'butterfly-clean': {pose:t => flyToHand(t,butterflyRest,butterflyPerch,.17)},
  'flower-clean': {pose:t => ({angle:9*pulse(t,2.6,3.6,4.44,5.6),scaleX:1+.22*pulse(t,1.62,3.24,4.45,5.73),scaleY:1+.19*pulse(t,1.62,3.24,4.45,5.73),pivot:[500,737]})},
  'rocket-clean': {pose:(t,index) => {
    if (index === 1) {
      const size = 1 - .995*pulse(t,2.22,2.66,5.21,5.93);
      return {scaleX:size,scaleY:size,pivot:[762,262]};
    }
    const launch=pulse(t,1.44,2.69,3.58,5.39);
    return {dx:wave(t,7)*3*pulse(t,.43,.8,1.49,1.9),dy:-138*launch,angle:-4*launch,pivot:[500,605]};
  }},
  'whale-clean': {pose:t=>({angle:4*wave(t,.27),dy:-17*pulse(t,.75,1.86,2.57,4.45),pivot:[500,506]})},
  'triceratops-v4-clean': {pose:t=>({angle:-7*pulse(t,1.88,2.51,2.62,3.65),pivot:[506,747]})},
  'princess-dress-clean': {pose:t=>({angle:12*wave(t,.55)*pulse(t,.45,1.0,3.84,4.25)+7*pulse(t,4.25,4.64,4.87,5.36),
    scaleX:1+.13*pulse(t,.6,1.4,3.65,4.45),pivot:[500,783]})},
  sailboat: {pose:t=>({dx:70*pulse(t,2.46,4.71,5,6.35),dy:-5*wave(t,.7),angle:2.3*wave(t,.71),pivot:[500,688]}),
    axis:'y', offset:(y,t)=>({
      x:52*arc(clamp((y-183)/405))*clamp((y-320)/64)*pulse(t,1.87,2.3,4.4,5.63)
    })},
  'princess-castle-clean': {axis:'y',offset:(y,t)=>({
    y:-40*clamp((124-y)/63)*pulse(t,3.48,4.46,5.52,6.31)
  })},
  'parrot-cute-clean': {axis:false,pose:t=>flyToHand(t,parrotRest,parrotPerch,.19,14*wave(t,.67))},
  'rabbit-garden-v2-clean': {pose:(t,index)=>{
    if (index===2) {
      const lift=pulse(t,1.23,1.84,3.98,5.84);
      return {dx:-127*advance(t,2.04,3.23)*lift,dy:-122*lift,angle:-22*lift,pivot:[766,635]};
    }
    if (index===0) {
      const flop=pulse(t,3.16,3.84,4.34,5.5);
      return {dx:107*pulse(t,1.7,3.15,4.6,6.2),dy:-28*arc(advance(t,1.8,2.66)),angle:-18*flop,pivot:[503,718]};
    }
  }},
  'dino-picnic-clean': {pose:t=>({angle:-6*pulse(t,3.33,3.93,4.17,5.42),dx:-13*pulse(t,3.33,3.93,4.17,5.42),pivot:[519,687]}),
    axis:'x', offset:(x,t)=>({y:85*clamp((560-x)/205)**2*pulse(t,2.64,3.83,4.14,5.42)})},
  'halloween-photo-v4-clean': {time:t=> t<3.15 ? t : t<5.4 ? 0 : (t-5.4)*.65},
  'island-dino-clean': {detail:false},
  'island-turtle-clean': {time:t=> {
    if (t<1.4) return t*1.5;
    if (t<4.75) return 10+3.1*pulse(t,1.62,2.66,3.02,4.3);
    return mix(3.2,9.7,advance(t,4.75,6.3));
  },
    pose:t=>({angle:12*pulse(t,3.22,3.74,4.2,5.27),
      scaleX:1-2*pulse(t,3.02,3.65,5,6.2),pivot:[482,755]})}
};

export const pictureActionTime = phase;
