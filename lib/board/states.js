// Board presets used by slides (data-board="name").
// Scene units are millimetres relative to the board centre (KiCad x 80, y 105).
//   scene x = kicad x - 80, scene z = kicad y - 105, +y = up out of the top side.
//
// cam:    az (deg, 0 = looking from the bottom edge), el (deg, 90 = top-down), dist (mm), target [x,y,z]
// frame:  shift of the board in the viewport, fractions of width/height ([0.22, 0] = right of centre)
// style:  'line' | 'solid' | 'xray' | 'blueprint' (see STYLES)
// explode 0..1, focus [refs or layer names], hide [refs / layer names / 'components']
// labels  [{ ref, text, sub, side: 'left'|'right' }]

// Key parts in scene coordinates (for targeting the camera).
export const P = {
  esp: [17.9, 2, 1.1],
  nfc: [-4.1, 2, -41.5],
  coil: [0.75, 0, -34],
  kbd: [-19.85, 2, 43.1],
  usb: [-26.6, 2, 6.9],
  oled: [0, 2, 3.85],
  charger: [-16.5, 2, -3.5],
  buck: [0.4, 2, -10.5],
};

export const STYLES = {
  line: { solid: 0, xray: 0, edge: 1 },
  solid: { solid: 1, xray: 0, edge: 0.18 },
  xray: { solid: 0, xray: 1, edge: 0.55 },
  ghost: { solid: 0, xray: 0, edge: 0.35 },
};

// stack = position in the exploded stack (multiplied by the layer gap)
export const LAYERS = [
  { name: 'silk_bot', stack: -5, tone: 0.95, label: 'B.Silk', sub: 'legend', hideWhenFlat: true },
  { name: 'mask_bot', stack: -4, tone: 0.2, alpha: 0.9, label: 'B.Mask', sub: 'solder mask', hideWhenFlat: true },
  { name: 'cu_bot', stack: -3, tone: 0.62, metalness: 0.7, roughness: 0.35, label: 'B.Cu', sub: 'signals / GND' },
  { name: 'cu_in2', stack: -1.4, tone: 0.62, metalness: 0.7, roughness: 0.35, label: 'In2.Cu', sub: 'GND · routing' },
  { name: 'body', stack: 0, tone: 0.3, edge: 0.7, label: 'FR-4', sub: '1.6 mm core' },
  { name: 'cu_in1', stack: 1.4, tone: 0.62, metalness: 0.7, roughness: 0.35, label: 'In1.Cu', sub: "GND plane" },
  { name: 'cu_top', stack: 3, tone: 0.62, metalness: 0.7, roughness: 0.35, label: 'F.Cu', sub: 'signals · NFC coil' },
  { name: 'mask_top', stack: 4, tone: 0.18, alpha: 0.88, label: 'F.Mask', sub: 'solder mask' },
  { name: 'silk_top', stack: 5, tone: 0.95, label: 'F.Silk', sub: 'legend' },
  { name: 'vias', stack: 0, tone: 0.62, metalness: 0.7, roughness: 0.35 },
];

// The PN7160 3D model can't be redistributed, so it's drawn as a block (KiCad coordinates, mm).
export const EXTRA_PARTS = [{ ref: 'U6', x: 75.9375, y: 63.55, w: 6, d: 6, h: 0.85, tone: 0.1 }];

const iso = { az: -32, el: 32, dist: 260, target: [0, 0, 0] };

export const STATES = {
  hidden: { cam: { ...iso, dist: 330 }, style: 'line', opacity: 0, lift: 30 },

  // title: board floats on the right, drawn like a technical illustration
  hero: { cam: { az: -38, el: 30, dist: 300, target: [0, 0, 5] }, frame: [0.21, 0.02], style: 'line' },
  heroSolid: { cam: { az: -38, el: 30, dist: 300, target: [0, 0, 5] }, frame: [0.21, 0.02], style: 'solid' },
  heroGhost: { cam: { az: -50, el: 26, dist: 290, target: [0, 0, 5] }, frame: [0.22, 0.02], style: 'ghost', opacity: 0.6 },

  // chapter "hardware" – dark x-ray
  xray: { cam: { az: -28, el: 34, dist: 290, target: [0, 0, 0] }, frame: [0.27, 0], style: 'xray' },

  // overview, top-down, with callouts
  top: {
    cam: { az: 0, el: 89.99, dist: 300, target: [0, 0, 2] }, frame: [0.2, 0], style: 'line',
    labels: [
      { ref: 'U3', text: 'ESP32-C3', sub: 'MCU · Wi-Fi · BLE', side: 'right' },
      { ref: 'U6', text: 'PN7160', sub: 'NFC controller', side: 'left' },
      { ref: 'J1', text: 'USB-C', sub: 'power · data', side: 'left' },
      { ref: 'DS1', text: 'OLED socket', sub: '24-pin · 0.5 mm', side: 'right' },
      { ref: 'U8', text: 'PCF8574T', sub: 'keypad expander', side: 'right' },
      { ref: 'J2', text: 'Battery', sub: 'JST-PH · Li-ion', side: 'left' },
    ],
  },

  esp: {
    cam: { az: -28, el: 46, dist: 250, target: [4, 0, 6] }, frame: [0.2, 0.03], style: 'solid', focus: ['U3'],
    labels: [{ ref: 'U3', text: 'ESP32-C3-WROOM-02-N4', sub: 'U3 · 4 MB flash', side: 'right' }],
  },
  nfc: {
    cam: { az: 8, el: 58, dist: 215, target: [1, 0, -22] }, frame: [0.22, 0.02], style: 'line', focus: ['U6', 'cu_top', 'L2', 'L3', 'Y1'],
    labels: [
      { ref: 'U6', text: 'PN7160', sub: 'NCI 2.0 · I²C 0x28', side: 'right' },
      { ref: 'Y1', text: '27.12 MHz', sub: 'crystal', side: 'right' },
    ],
  },
  power: {
    cam: { az: -30, el: 48, dist: 225, target: [-4, 0, 2] }, frame: [0.22, 0.02], style: 'solid',
    focus: ['U1', 'U2', 'L1', 'Q1', 'D1', 'D2', 'U5', 'J1', 'J2', 'U4'],
    labels: [
      { ref: 'U1', text: 'TP4054', sub: 'Li-ion charger · 100 mA', side: 'right' },
      { ref: 'U2', text: 'SY8089', sub: 'buck · 3.31 V', side: 'right' },
      { ref: 'Q1', text: 'IRLML6402', sub: 'USB / battery select', side: 'right' },
      { ref: 'U5', text: 'TLV803', sub: 'supervisor · 3.08 V', side: 'right' },
    ],
  },
  kbd: {
    cam: { az: -12, el: 52, dist: 215, target: [0, 0, 26] }, frame: [0.22, 0.02], style: 'line', focus: ['U8', 'J3', 'J4', 'J5', 'MB1', 'MB2'],
    labels: [
      { ref: 'U8', text: 'PCF8574T', sub: '8-bit I/O · 0x20', side: 'right' },
      { ref: 'J3', text: '3×4 keypad', sub: 'J3 · 9-pin header', side: 'right' },
    ],
  },
  bus: { cam: { az: 0, el: 89.99, dist: 300, target: [0, 0, 2] }, frame: [0.25, 0], style: 'ghost', opacity: 0.55 },

  // the exploded stack
  explode: { cam: { az: -34, el: 22, dist: 440, target: [0, 12, 0] }, frame: [0.13, 0.0], style: 'solid', explode: 1, layerLabels: true },
  explodeLine: { cam: { az: -40, el: 20, dist: 440, target: [0, 12, 0] }, frame: [0.13, 0.0], style: 'line', explode: 1, layerLabels: true },
  explodeX: { cam: { az: -46, el: 18, dist: 450, target: [0, 12, 0] }, frame: [0.13, 0.0], style: 'xray', explode: 1, layerLabels: true },

  remaining: { cam: { az: 20, el: 62, dist: 260, target: [0, 0, -12] }, frame: [0.24, 0.02], style: 'line', focus: ['U6', 'cu_top', 'L2', 'L3', 'Y1'] },
  bottom: { cam: { az: 180, el: -40, dist: 250, target: [0, 0, 0] }, frame: [0.2, 0], style: 'line' },

  // firmware chapter – board recedes into the background
  far: { cam: { az: -60, el: 18, dist: 420, target: [0, 0, 0] }, frame: [0.3, 0.1], style: 'ghost', opacity: 0.35 },
  farX: { cam: { az: -70, el: 30, dist: 300, target: [0, 0, 0] }, frame: [0.27, 0], style: 'xray', opacity: 0.75 },

  // wrap-up
  outro: { cam: { az: 25, el: 30, dist: 300, target: [0, 0, 0] }, frame: [0.26, 0], style: 'solid', spin: 1 },
};
