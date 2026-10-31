export function LineChart({ points }) {
  if (points.length < 2) {
    return <p className="muted pad">Place at least two orders to see the trend.</p>;
  }
  const W = 640, H = 230, L = 52, R = 16, T = 14, B = 30;
  const max = Math.max(...points.map((p) => p.value), 1) * 1.15;
  const x = (i) => L + (i * (W - L - R)) / (points.length - 1);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(points.length - 1)},${H - B} L${x(0)},${H - B} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelIdx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue trend chart">
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} />
          <text className="axis" x={L - 8} y={y(max * t) + 4} textAnchor="end">
            {Math.round(max * t)}
          </text>
        </g>
      ))}
      <path className="area" d={area} />
      <path className="line" d={line} />
      {points.map((p, i) => (
        <circle key={i} className="dot" cx={x(i)} cy={y(p.value)} r="3.5">
          <title>{`${p.label}: ₹${p.value}`}</title>
        </circle>
      ))}
      {labelIdx.map((i) => (
        <text key={i} className="axis" x={x(i)} y={H - 8} textAnchor="middle">
          {points[i].label}
        </text>
      ))}
    </svg>
  );
}