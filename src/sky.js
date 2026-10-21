// Time of day for the hero sky. Colors are linear RGB 0..1 for the shader.
export const SKIES = {
  dawn: {
    label: 'Dawn',
    top: [0.97, 0.7, 0.48], bottom: [0.99, 0.91, 0.77], glow: [1, 0.86, 0.66], body: [0.894, 0.341, 0.18],
    sun: { x: 0.74, y: 0.53, rise: 0.15 }, night: 0, storm: 0, waves: 1, ink: '#1b2433', fade: '253,231,196'
  },
  day: {
    label: 'Day',
    top: [0.52, 0.76, 0.92], bottom: [0.93, 0.95, 0.9], glow: [1, 0.97, 0.86], body: [1, 0.93, 0.7],
    sun: { x: 0.78, y: 0.22, rise: 0.05 }, night: 0, storm: 0, waves: 1, ink: '#1b2433', fade: '232,242,246'
  },
  dusk: {
    label: 'Dusk',
    top: [0.3, 0.25, 0.43], bottom: [0.96, 0.64, 0.42], glow: [1, 0.62, 0.42], body: [0.86, 0.24, 0.2],
    sun: { x: 0.7, y: 0.5, rise: -0.12 }, night: 0.25, storm: 0, waves: 1.3, ink: '#1b2433', fade: '247,196,160'
  },
  night: {
    label: 'Night',
    top: [0.02, 0.04, 0.11], bottom: [0.09, 0.14, 0.27], glow: [0.55, 0.62, 0.85], body: [0.95, 0.93, 0.84],
    sun: { x: 0.6, y: 0.53, rise: 0.08 }, night: 1, storm: 0, waves: 2, ink: '#f4efe4', fade: '6,12,30'
  },
  storm: {
    label: 'Storm',
    top: [0.08, 0.1, 0.14], bottom: [0.24, 0.28, 0.34], glow: [0.4, 0.45, 0.55], body: [0.6, 0.62, 0.66],
    sun: { x: 0.72, y: -0.4, rise: 0 }, night: 0.85, storm: 1, waves: 3.4, ink: '#f4efe4', fade: '12,16,24'
  }
};

export function skyForHour(h) {
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

export function resolveSky(pref, date = new Date()) {
  return pref && pref !== 'auto' && SKIES[pref] ? pref : skyForHour(date.getHours());
}
