// Chart utilities — pure SVG, no dependencies
// All charts use responsive viewBox so they fill their container.
// Colors match the dark design system.

const TEXT   = '#a1a1aa'; // --text-secondary
const MUTED  = '#52525b'; // --text-muted
const BORDER = 'rgba(255,255,255,0.08)';
const ACCENT = '#2563eb';
const SERIES = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

class ChartUtils {

  // ── Bar chart (single accent color, with subtle grid lines) ─────────────
  static renderBarChart(data, options = {}) {
    const { color = ACCENT } = options;
    const W = 280, H = 140;
    const padL = 8, padR = 8, padT = 12, padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barW = Math.max(4, Math.floor(chartW / data.length) - 4);

    const gridLines = [0.25, 0.5, 0.75, 1].map(f => {
      const y = padT + chartH - f * chartH;
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"
                stroke="${BORDER}" stroke-width="1"/>`;
    }).join('');

    const bars = data.map((d, i) => {
      const bH = (d.value / maxVal) * chartH;
      const x = padL + i * (chartW / data.length) + (chartW / data.length - barW) / 2;
      const y = padT + chartH - bH;
      const shortLabel = d.label.length > 3 ? d.label.slice(0, 3) : d.label;
      return `<g>
        <rect x="${x}" y="${y}" width="${barW}" height="${bH}"
              fill="${color}" rx="2" opacity="0.85">
          <title>${d.label}: ${d.value.toLocaleString()}</title>
        </rect>
        <text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle"
              font-size="9" fill="${MUTED}">${shortLabel}</text>
      </g>`;
    }).join('');

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible;">
      ${gridLines}
      <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}"
            stroke="${BORDER}" stroke-width="1"/>
      ${bars}
    </svg>`;
  }

  // ── Line / sparkline chart ───────────────────────────────────────────────
  static renderLineChart(data, options = {}) {
    const { color = ACCENT, showDots = true } = options;
    const W = 280, H = 100;
    const padL = 4, padR = 4, padT = 8, padB = 4;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;

    const pts = data.map((v, i) => {
      const x = padL + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padT + chartH - ((v - minVal) / range) * chartH;
      return [x, y];
    });

    const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
    const areaBase = padT + chartH;
    const area = `${padL},${areaBase} ${polyline} ${pts[pts.length - 1][0]},${areaBase}`;

    const dots = showDots ? pts.map(([x, y], i) => `
      <circle cx="${x}" cy="${y}" r="2.5" fill="${color}">
        <title>${data[i].toLocaleString()}</title>
      </circle>`).join('') : '';

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;">
      <polygon points="${area}" fill="${color}" fill-opacity="0.08"/>
      <polyline points="${polyline}" fill="none" stroke="${color}"
                stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
  }

  // ── Donut / pie chart with legend ───────────────────────────────────────
  static renderDonutChart(data, options = {}) {
    const { colors = SERIES } = options;
    const S = 120, T = 22;
    const r = (S - T) / 2, cx = S / 2, cy = S / 2;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;

    let angle = -Math.PI / 2;
    const arcs = data.map((d, i) => {
      const sweep = (d.value / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      angle += sweep;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const large = sweep > Math.PI ? 1 : 0;
      return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}"
                    fill="none" stroke="${colors[i % colors.length]}"
                    stroke-width="${T}" stroke-linecap="butt">
                <title>${d.label}: ${d.value.toLocaleString()} (${Math.round(d.value / total * 100)}%)</title>
              </path>`;
    }).join('');

    const legend = data.map((d, i) => `
      <div style="display:flex;align-items:center;gap:0.375rem;font-size:0.75rem;">
        <span style="width:8px;height:8px;border-radius:2px;background:${colors[i % colors.length]};flex-shrink:0;"></span>
        <span style="color:${TEXT};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.label}</span>
        <span style="margin-left:auto;font-weight:600;color:#f4f4f5;">${Math.round(d.value / total * 100)}%</span>
      </div>`).join('');

    return `<div style="display:flex;align-items:center;gap:1.25rem;width:100%;">
      <svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="flex-shrink:0;">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                stroke="rgba(255,255,255,0.06)" stroke-width="${T}"/>
        ${arcs}
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
              font-size="15" font-weight="700" fill="#f4f4f5">${total.toLocaleString()}</text>
      </svg>
      <div style="flex:1;display:flex;flex-direction:column;gap:0.35rem;min-width:0;">
        ${legend}
      </div>
    </div>`;
  }

  // ── Gauge / radial progress ─────────────────────────────────────────────
  static renderGauge(value, max, options = {}) {
    const { color = ACCENT, label = '' } = options;
    const S = 120, r = 44, cx = 60, cy = 64;
    const pct = Math.min(Math.max(value / (max || 1), 0), 1);
    const startAngle = -Math.PI * 0.8;
    const endAngle   = Math.PI * 0.8;
    const sweep = startAngle + pct * (endAngle - startAngle);
    const circ = 2 * Math.PI * r;
    const dashLen = pct * circ * 0.8;
    const gapLen  = circ - dashLen;

    const trackX1 = cx + r * Math.cos(startAngle);
    const trackY1 = cy + r * Math.sin(startAngle);
    const trackX2 = cx + r * Math.cos(endAngle);
    const trackY2 = cy + r * Math.sin(endAngle);

    const fillX2 = cx + r * Math.cos(sweep);
    const fillY2 = cy + r * Math.sin(sweep);
    const largeTrack = 1;
    const largeFill  = pct > 0.5 ? 1 : 0;

    return `<svg viewBox="0 0 ${S} ${S + 10}" width="${S}" style="display:block;">
      <path d="M ${trackX1} ${trackY1} A ${r} ${r} 0 ${largeTrack} 1 ${trackX2} ${trackY2}"
            fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10" stroke-linecap="round"/>
      ${pct > 0 ? `<path d="M ${trackX1} ${trackY1} A ${r} ${r} 0 ${largeFill} 1 ${fillX2} ${fillY2}"
            fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>` : ''}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" dominant-baseline="middle"
            font-size="20" font-weight="700" fill="#f4f4f5">${Math.round(pct * 100)}%</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle"
            font-size="10" fill="${MUTED}">${label}</text>
    </svg>`;
  }
}

export default ChartUtils;
