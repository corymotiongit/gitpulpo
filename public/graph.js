'use strict';
// Layout de carriles (lanes) para el grafo de commits, estilo GitKraken.
// Entrada: commits en orden topológico (hijos antes que padres).
// Salida por commit: carril del nodo, curvas de entrada/salida y carriles que pasan de largo.
const GitGraph = (() => {
  // Paleta de carriles de DESIGN.md, tokenizada en style.css (--lane-0..7)
  // para que el grafo siga al tema claro/oscuro sin re-render.
  const PALETTE = [
    'var(--lane-0)', 'var(--lane-1)', 'var(--lane-2)', 'var(--lane-3)',
    'var(--lane-4)', 'var(--lane-5)', 'var(--lane-6)', 'var(--lane-7)',
  ];

  const ROW_H = 30;
  const LANE_W = 17;
  const R = 4.5;

  function layout(commits) {
    const lanes = [];      // hash que espera cada carril
    const laneColor = [];  // índice de color por carril
    let colorSeq = 0;
    let maxLanes = 1;
    const rows = [];

    for (const c of commits) {
      const preLanes = lanes.slice();
      const preColor = laneColor.slice();

      const idxs = [];
      lanes.forEach((hsh, i) => { if (hsh === c.hash) idxs.push(i); });

      let lane;
      if (idxs.length) {
        lane = Math.min(...idxs);
      } else {
        lane = lanes.indexOf(null);
        if (lane === -1) { lane = lanes.length; lanes.push(null); laneColor.push(null); }
        laneColor[lane] = colorSeq++ % PALETTE.length;
      }

      const inputs = idxs.map(i => ({ from: i, color: preColor[i] != null ? preColor[i] : laneColor[lane] }));
      for (const i of idxs) if (i !== lane) { lanes[i] = null; laneColor[i] = null; }

      const nodeColor = laneColor[lane];
      const outputs = [];

      if (c.parents.length) {
        // primer padre hereda el carril y color del commit
        lanes[lane] = c.parents[0];
        outputs.push({ to: lane, color: nodeColor });
        // padres de merge: se unen a un carril existente o abren uno nuevo
        for (let k = 1; k < c.parents.length; k++) {
          const pk = c.parents[k];
          let existing = lanes.indexOf(pk);
          if (existing !== -1 && existing !== lane) {
            outputs.push({ to: existing, color: laneColor[existing] });
          } else {
            let nl = -1;
            for (let i = 0; i < lanes.length; i++) if (lanes[i] === null) { nl = i; break; }
            if (nl === -1) { nl = lanes.length; lanes.push(null); laneColor.push(null); }
            lanes[nl] = pk;
            laneColor[nl] = colorSeq++ % PALETTE.length;
            outputs.push({ to: nl, color: laneColor[nl] });
          }
        }
      } else {
        lanes[lane] = null;
        laneColor[lane] = null;
      }

      const passing = [];
      for (let i = 0; i < preLanes.length; i++) {
        if (preLanes[i] && preLanes[i] !== c.hash) passing.push({ lane: i, color: preColor[i] });
      }

      let active = lanes.length;
      while (active > 0 && lanes[active - 1] === null) active--;
      maxLanes = Math.max(maxLanes, active, lane + 1);

      rows.push({ hash: c.hash, lane, color: nodeColor, inputs, outputs, passing });
    }
    return { rows, maxLanes };
  }

  const cx = i => i * LANE_W + LANE_W / 2 + 2;

  function rowSvg(row, width) {
    const cy = ROW_H / 2;
    const parts = [];
    const col = i => PALETTE[i % PALETTE.length];

    // var(--lane-N) no es válido en atributos de presentación SVG: va en style=.
    for (const p of row.passing) {
      parts.push(`<line x1="${cx(p.lane)}" y1="0" x2="${cx(p.lane)}" y2="${ROW_H}" style="stroke:${col(p.color)}" stroke-width="2" opacity="0.85"/>`);
    }
    for (const inp of row.inputs) {
      const x1 = cx(inp.from), x2 = cx(row.lane);
      if (x1 === x2) {
        parts.push(`<line x1="${x2}" y1="0" x2="${x2}" y2="${cy}" style="stroke:${col(inp.color)}" stroke-width="2"/>`);
      } else {
        parts.push(`<path d="M ${x1} 0 C ${x1} ${cy}, ${x2} 0, ${x2} ${cy}" fill="none" style="stroke:${col(inp.color)}" stroke-width="2"/>`);
      }
    }
    for (const out of row.outputs) {
      const x1 = cx(row.lane), x2 = cx(out.to);
      if (x1 === x2) {
        parts.push(`<line x1="${x1}" y1="${cy}" x2="${x1}" y2="${ROW_H}" style="stroke:${col(out.color)}" stroke-width="2"/>`);
      } else {
        parts.push(`<path d="M ${x1} ${cy} C ${x1} ${ROW_H}, ${x2} ${cy}, ${x2} ${ROW_H}" fill="none" style="stroke:${col(out.color)}" stroke-width="2"/>`);
      }
    }
    const nx = cx(row.lane);
    parts.push(`<circle cx="${nx}" cy="${cy}" r="${R + 2.5}" style="fill:${col(row.color)}" opacity="0.2"/>`);
    parts.push(`<circle cx="${nx}" cy="${cy}" r="${R}" style="fill:var(--node-fill);stroke:${col(row.color)}" stroke-width="2.2"/>`);
    return `<svg width="${width}" height="${ROW_H}" style="display:block">${parts.join('')}</svg>`;
  }

  function wipSvg(lane, width) {
    const cy = ROW_H / 2;
    const x = cx(lane);
    // WIP: familia amarilla — trazo ocre (--wip-stroke) + halo --wip-halo, tokens del tema.
    return `<svg width="${width}" height="${ROW_H}" style="display:block">
      <line x1="${x}" y1="${cy}" x2="${x}" y2="${ROW_H}" style="stroke:var(--wip-stroke)" stroke-width="2" stroke-dasharray="3 3"/>
      <circle cx="${x}" cy="${cy}" r="${R + 2.5}" style="fill:var(--wip-halo)" opacity="0.45"/>
      <circle cx="${x}" cy="${cy}" r="${R}" style="fill:var(--node-fill);stroke:var(--wip-stroke)" stroke-width="2" stroke-dasharray="2.5 2.5"/>
    </svg>`;
  }

  return { layout, rowSvg, wipSvg, PALETTE, ROW_H, LANE_W, laneX: cx };
})();
