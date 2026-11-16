const WHITE_EDGE = .08;
const BLACK_EDGE = .92;
const HUE_STOPS = [[255,0,0],[255,255,0],[0,255,0],[0,255,255],[0,0,255],[255,0,255],[255,0,0]];
const HUE_NAMES = ['紅','橙','黃','黃綠','綠','青綠','青','天空藍','藍','紫','洋紅','粉紅'];

export function clampSpectrum(value) {
  return Math.max(0, Math.min(1, value));
}

export function spectrumColor({x,y}) {
  const hue = clampSpectrum(x) * 6;
  const step = Math.min(5, Math.floor(hue));
  const mix = hue-step;
  const blend = y<=.5
    ? 1-clampSpectrum((y-WHITE_EDGE)/(.5-WHITE_EDGE))
    : clampSpectrum((y-.5)/(BLACK_EDGE-.5));
  const backdrop = y<=.5 ? 255 : 0;
  const channels = HUE_STOPS[step].map((channel,index) => {
    const value = channel+(HUE_STOPS[step+1][index]-channel)*mix;
    return Math.round(value*(1-blend)+backdrop*blend).toString(16).padStart(2,'0');
  });
  return '#'+channels.join('');
}

export function spectrumName({x,y}) {
  if (y<=WHITE_EDGE) return '白色';
  if (y>=BLACK_EDGE) return '黑色';
  const hue = HUE_NAMES[Math.round(clampSpectrum(x)*HUE_NAMES.length) % HUE_NAMES.length];
  const tone = y<.36 ? '淺' : y>.64 ? '深' : '';
  return tone+hue+'色';
}
