// Stack in physical order so both board views composite the same layers.
export const boardLayers = [
  { id: "bcu", src: "/pcb/bcu.svg", name: "B.Cu", desc: "back copper", color: "#3c7a6a", opacity: 0.6, depth: 3 },
  { id: "in2cu", src: "/pcb/in2cu.svg", name: "In2.Cu", desc: "inner copper 2", color: "#789b72", opacity: 0.45, depth: 6 },
  { id: "in1cu", src: "/pcb/in1cu.svg", name: "In1.Cu", desc: "inner copper 1", color: "#8d82b5", opacity: 0.45, depth: 9 },
  { id: "fcu", src: "/pcb/fcu.svg", name: "F.Cu", desc: "front copper", color: "#d98e4a", opacity: 1, depth: 12 },
  { id: "ffab", src: "/pcb/ffab.svg", name: "F.Fab", desc: "assembly drawing", color: "#6e7a70", opacity: 0.3, depth: 15 },
  { id: "fsilk", src: "/pcb/fsilk.svg", name: "F.Silkscreen", desc: "labels", color: "#e4e0d4", opacity: 0.9, depth: 19 },
  { id: "edge", src: "/pcb/edge.svg", name: "Edge.Cuts", desc: "board outline", color: "#9ba69c", opacity: 0.85, depth: 23 },
];
