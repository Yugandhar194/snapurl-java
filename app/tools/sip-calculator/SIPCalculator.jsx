"use client";

import { useState } from "react";
import ThemeToggle from "../../ThemeToggle";
import styles from "./SIPCalculator.module.css";

const chart = { width: 800, height: 300, left: 62, right: 22, top: 18, bottom: 42 };
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function projectSIP(monthlyAmount, annualReturn, years, yearlyIncrease) {
  const months = years * 12;
  const monthlyRate = annualReturn / 1200;
  const points = [{ month: 0, invested: 0, value: 0 }];
  let invested = 0;
  let value = 0;

  for (let month = 1; month <= months; month += 1) {
    const contribution = monthlyAmount * (1 + yearlyIncrease / 100) ** Math.floor((month - 1) / 12);
    invested += contribution;
    value = value * (1 + monthlyRate) + contribution;
    if (month % 12 === 0 || month === months) points.push({ month, invested, value });
  }

  return { points, invested, value, gain: value - invested, months, years };
}

function linePath(points, key, maximum) {
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.height - chart.top - chart.bottom;
  return points.map((point, index) => {
    const x = chart.left + (point.month / points.at(-1).month) * plotWidth;
    const y = chart.top + plotHeight - (point[key] / maximum) * plotHeight;
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function SIPChart({ points, invested, value, years }) {
  const maximum = Math.max(value, invested, 1);
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.height - chart.top - chart.bottom;
  const valuePath = linePath(points, "value", maximum);
  const investedPath = linePath(points, "invested", maximum);
  const areaPath = `${valuePath} L${chart.left + plotWidth},${chart.top + plotHeight} L${chart.left},${chart.top + plotHeight} Z`;
  const yearStep = Math.max(1, Math.ceil(years / 5));
  const ticks = Array.from({ length: Math.ceil(years / yearStep) + 1 }, (_, index) => Math.min(index * yearStep, years));

  return <div className={styles.chartFrame}>
    <svg className={styles.chart} viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`Projected SIP value and invested amount over ${years} years`}>
      <defs>
        <linearGradient id="sip-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity=".22" /><stop offset="100%" stopColor="var(--brand)" stopOpacity="0" /></linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const y = chart.top + plotHeight * (1 - fraction);
        return <g key={fraction}>
          <line x1={chart.left} x2={chart.left + plotWidth} y1={y} y2={y} className={styles.gridLine} />
          <text x={chart.left - 10} y={y + 4} className={styles.axisLabel} textAnchor="end">{money.format(maximum * fraction)}</text>
        </g>;
      })}
      {ticks.map((year) => {
        const x = chart.left + (year / years) * plotWidth;
        return <g key={year}>
          <line x1={x} x2={x} y1={chart.top} y2={chart.top + plotHeight} className={styles.gridLine} />
          <text x={x} y={chart.height - 14} className={styles.axisLabel} textAnchor="middle">{year === 0 ? "Start" : `Year ${year}`}</text>
        </g>;
      })}
      <path d={areaPath} fill="url(#sip-area)" />
      <path d={investedPath} className={styles.investedLine} />
      <path d={valuePath} className={styles.valueLine} />
      {points.filter((point) => point.month > 0).map((point) => {
        const x = chart.left + (point.month / points.at(-1).month) * plotWidth;
        const y = chart.top + plotHeight - (point.value / maximum) * plotHeight;
        return <circle key={point.month} cx={x} cy={y} r="3.5" className={styles.point} aria-hidden="true" />;
      })}
    </svg>
  </div>;
}

export default function SIPCalculator() {
  const [monthlyAmount, setMonthlyAmount] = useState(5000);
  const [annualReturn, setAnnualReturn] = useState(12);
  const [years, setYears] = useState(10);
  const [yearlyIncrease, setYearlyIncrease] = useState(0);
  const [projection, setProjection] = useState(() => projectSIP(5000, 12, 10, 0));

  function calculateSIP() {
    setProjection(projectSIP(monthlyAmount, annualReturn, years, yearlyIncrease));
  }

  return <main className={styles.page}>
    <nav className="advanced-nav">
      <a className="brand" href="/"><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>SnapURL</span></a>
      <a className="back-link" href="/">← Back to SnapURL</a>
      <div className="nav-actions"><ThemeToggle /></div>
    </nav>
    <header className="tool-hero"><div className="tool-hero-icon" aria-hidden="true">↗</div><h1>SIP Calculator</h1><p>Adjust your monthly investment assumptions and see the projected growth update live.</p></header>

    <section className={styles.workspace} aria-label="SIP Calculator">
      <div className={styles.controls}>
        <label>Monthly investment <strong>{money.format(monthlyAmount)}</strong><input type="range" min="500" max="200000" step="500" value={monthlyAmount} onChange={(event) => setMonthlyAmount(Number(event.target.value))} /></label>
        <label>Expected annual return <strong>{annualReturn}%</strong><input type="range" min="0" max="30" step="0.5" value={annualReturn} onChange={(event) => setAnnualReturn(Number(event.target.value))} /></label>
        <label>Investment period <strong>{years} years</strong><input type="range" min="1" max="40" step="1" value={years} onChange={(event) => setYears(Number(event.target.value))} /></label>
        <label>Annual SIP increase <strong>{yearlyIncrease}%</strong><input type="range" min="0" max="50" step="1" value={yearlyIncrease} onChange={(event) => setYearlyIncrease(Number(event.target.value))} /></label>
        <button className={`gradient-action ${styles.calculateButton}`} type="button" onClick={calculateSIP}>Calculate SIP</button>
      </div>

      <section className={styles.projection} aria-label="Projected investment">
        <div className={styles.metrics}>
          <div><span>Estimated value</span><strong>{money.format(projection.value)}</strong></div>
          <div><span>Invested amount</span><strong>{money.format(projection.invested)}</strong></div>
          <div><span>Estimated growth</span><strong>{money.format(projection.gain)}</strong></div>
        </div>
        <div className={styles.chartHeader}>
          <h2>Projected growth</h2>
          <div className={styles.legend}><span><i className={styles.valueKey} />Estimated value</span><span><i className={styles.investedKey} />Invested amount</span></div>
        </div>
        <SIPChart points={projection.points} invested={projection.invested} value={projection.value} years={projection.years} />
        <p className={styles.disclaimer}>Illustration only. Actual returns vary with market performance; this is not investment advice.</p>
      </section>
    </section>
    <footer className="tool-page-footer">SIP Calculator · Estimates are illustrative</footer>
  </main>;
}