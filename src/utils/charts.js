
// Simple Chart Utilities - Pure CSS/SVG, no external dependencies
// Renders mini charts for dashboard widgets

class ChartUtils {

    // Render a simple bar chart
    static renderBarChart(data, options = {}) {
        const { width = 300, height = 150, colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'] } = options;
        const maxValue = Math.max(...data.map(d => d.value), 1);
        const barWidth = Math.floor((width - 20) / data.length) - 8;

        const bars = data.map((d, i) => {
            const barHeight = (d.value / maxValue) * (height - 40);
            const x = 10 + i * (barWidth + 8);
            const y = height - 30 - barHeight;
            const color = colors[i % colors.length];

            return `
                <g class="bar-group">
                    <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
                          fill="${color}" rx="4" class="bar"/>
                    <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" 
                          class="bar-label" fill="#6b7280" font-size="10">${d.label}</text>
                    <title>${d.label}: ${d.value.toLocaleString()}</title>
                </g>
            `;
        }).join('');

        return `
            <svg width="${width}" height="${height}" class="bar-chart">
                ${bars}
            </svg>
        `;
    }

    // Render a simple line chart (sparkline style)
    static renderLineChart(data, options = {}) {
        const { width = 300, height = 100, color = '#6366f1', fill = true } = options;
        const maxValue = Math.max(...data, 1);
        const minValue = Math.min(...data, 0);
        const range = maxValue - minValue || 1;

        const points = data.map((value, i) => {
            const x = (i / (data.length - 1)) * (width - 20) + 10;
            const y = height - 20 - ((value - minValue) / range) * (height - 40);
            return `${x},${y}`;
        }).join(' ');

        const areaPath = fill ? `
            <polygon points="10,${height - 20} ${points} ${width - 10},${height - 20}" 
                     fill="${color}" fill-opacity="0.1"/>
        ` : '';

        return `
            <svg width="${width}" height="${height}" class="line-chart">
                ${areaPath}
                <polyline points="${points}" 
                          fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
                ${data.map((value, i) => {
            const x = (i / (data.length - 1)) * (width - 20) + 10;
            const y = height - 20 - ((value - minValue) / range) * (height - 40);
            return `<circle cx="${x}" cy="${y}" r="3" fill="${color}"><title>${value.toLocaleString()}</title></circle>`;
        }).join('')}
            </svg>
        `;
    }

    // Render a donut/pie chart
    static renderDonutChart(data, options = {}) {
        const { size = 150, thickness = 30, colors = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'] } = options;
        const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
        const radius = (size - thickness) / 2;
        const center = size / 2;

        let currentAngle = -90;
        const arcs = data.map((d, i) => {
            const angle = (d.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;
            const color = colors[i % colors.length];

            return `
                <path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}"
                      fill="none" stroke="${color}" stroke-width="${thickness}"
                      class="donut-segment">
                    <title>${d.label}: ${d.value.toLocaleString()} (${Math.round(d.value / total * 100)}%)</title>
                </path>
            `;
        }).join('');

        return `
            <svg width="${size}" height="${size}" class="donut-chart">
                ${arcs}
                <text x="${center}" y="${center}" text-anchor="middle" dominant-baseline="middle"
                      font-size="18" font-weight="bold" fill="#1f2937">
                    ${total.toLocaleString()}
                </text>
            </svg>
        `;
    }

    // Render a progress/gauge chart
    static renderGauge(value, max, options = {}) {
        const { size = 120, color = '#10b981', label = '' } = options;
        const percentage = Math.min(Math.max(value / max, 0), 1);
        const radius = (size - 20) / 2;
        const center = size / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference * (1 - percentage);

        return `
            <svg width="${size}" height="${size}" class="gauge-chart">
                <circle cx="${center}" cy="${center}" r="${radius}" 
                        fill="none" stroke="#e5e7eb" stroke-width="10"/>
                <circle cx="${center}" cy="${center}" r="${radius}"
                        fill="none" stroke="${color}" stroke-width="10"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                        stroke-linecap="round" transform="rotate(-90 ${center} ${center})"/>
                <text x="${center}" y="${center - 5}" text-anchor="middle" 
                      font-size="20" font-weight="bold" fill="#1f2937">
                    ${Math.round(percentage * 100)}%
                </text>
                <text x="${center}" y="${center + 15}" text-anchor="middle" 
                      font-size="10" fill="#6b7280">
                    ${label}
                </text>
            </svg>
        `;
    }

    // Render mini stat with trend indicator
    static renderMiniTrend(current, previous, label) {
        const diff = current - previous;
        const percent = previous > 0 ? Math.round((diff / previous) * 100) : 0;
        const isPositive = diff >= 0;
        const arrow = isPositive ? '↑' : '↓';
        const color = isPositive ? '#10b981' : '#ef4444';

        return `
            <div class="mini-trend">
                <span class="trend-value" style="color: ${color}">
                    ${arrow} ${Math.abs(percent)}%
                </span>
                <span class="trend-label">${label}</span>
            </div>
        `;
    }
}

export default ChartUtils;
