"use client";

import { useEffect, useRef, useState } from "react";
import ThemeToggle from "../../ThemeToggle";
import styles from "./DateCalculator.module.css";

const DAY_MS = 86400000;
const modes = [
  ["difference", "Date Difference"],
  ["add", "Add / Subtract"],
  ["business", "Business Days"],
];
const durationUnits = ["years", "months", "weeks", "days", "hours", "minutes", "seconds"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function localInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addMonths(date, amount) {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  target.setDate(Math.min(date.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
  return target;
}

function calendarDifference(start, end) {
  let years = end.getFullYear() - start.getFullYear();
  let cursor = addMonths(start, years * 12);
  if (cursor > end) {
    years -= 1;
    cursor = addMonths(start, years * 12);
  }
  let months = (end.getFullYear() - cursor.getFullYear()) * 12 + end.getMonth() - cursor.getMonth();
  let next = addMonths(cursor, months);
  if (next > end) {
    months -= 1;
    next = addMonths(cursor, months);
  }
  cursor = next;
  const calendarStart = Date.UTC(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
  const calendarEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  let days = Math.floor((calendarEnd - calendarStart) / DAY_MS);
  let withDays = new Date(cursor);
  withDays.setDate(withDays.getDate() + days);
  if (withDays > end) {
    days -= 1;
    withDays = new Date(cursor);
    withDays.setDate(withDays.getDate() + days);
  }
  let remaining = Math.max(0, end.getTime() - withDays.getTime());
  const hours = Math.floor(remaining / 3600000);
  remaining %= 3600000;
  const minutes = Math.floor(remaining / 60000);
  remaining %= 60000;
  return { years, months, days, hours, minutes, seconds: Math.floor(remaining / 1000) };
}

function getDuration(first, second) {
  let start = first;
  let end = second;
  if (start > end) [start, end] = [end, start];
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return {
    calendar: calendarDifference(start, end),
    total: { weeks: Math.floor(days / 7), days, hours, minutes, seconds },
  };
}

function shiftDate(date, value, unit) {
  if (unit === "years") return addMonths(date, value * 12);
  if (unit === "months") return addMonths(date, value);
  const result = new Date(date);
  if (unit === "weeks") result.setDate(result.getDate() + value * 7);
  if (unit === "days") result.setDate(result.getDate() + value);
  if (unit === "hours") result.setHours(result.getHours() + value);
  if (unit === "minutes") result.setMinutes(result.getMinutes() + value);
  if (unit === "seconds") result.setSeconds(result.getSeconds() + value);
  return result;
}

function countBusinessDays(first, second, includeEnd, holidays) {
  let start = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  let end = new Date(second.getFullYear(), second.getMonth(), second.getDate());
  if (start > end) [start, end] = [end, start];
  if (includeEnd) end.setDate(end.getDate() + 1);
  let count = 0;
  for (const date = start; date < end; date.setDate(date.getDate() + 1)) {
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    if (date.getDay() !== 0 && date.getDay() !== 6 && !holidays.has(key)) count += 1;
  }
  return count;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(date);
}

function openPicker(inputRef) {
  if (typeof inputRef.current?.showPicker === "function") inputRef.current.showPicker();
  else inputRef.current?.focus();
}

function Metrics({ title, items }) {
  return <section className={styles.metricGroup}>
    <h3>{title}</h3>
    <dl className={styles.metrics}>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{new Intl.NumberFormat().format(value)}</dd></div>)}</dl>
  </section>;
}

export default function DateCalculator() {
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const [mode, setMode] = useState("difference");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeEnd, setIncludeEnd] = useState(false);
  const [operation, setOperation] = useState("add");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("days");
  const [holidayText, setHolidayText] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const now = localInputValue(new Date());
    setFrom(now);
    setTo(now);
  }, []);

  function calculate() {
    setMessage("");
    if (!from || (mode !== "add" && !to)) {
      setResult(null);
      setMessage("Choose the required date and time values first.");
      return;
    }
    const start = new Date(from);
    const end = mode === "add" ? null : new Date(to);
    if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
      setResult(null);
      setMessage("Enter valid date and time values.");
      return;
    }

    if (mode === "add") {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        setResult(null);
        setMessage("Enter a zero or positive duration.");
        return;
      }
      const finalDate = shiftDate(start, parsedAmount * (operation === "add" ? 1 : -1), unit);
      setResult({ mode, finalDate, duration: getDuration(start, finalDate) });
      return;
    }

    const first = start < end ? start : end;
    let countedEnd = start < end ? end : start;
    if (includeEnd) {
      countedEnd = new Date(countedEnd);
      countedEnd.setDate(countedEnd.getDate() + 1);
    }
    const duration = getDuration(first, countedEnd);
    if (mode === "business") {
      const holidays = new Set(holidayText.split(/[\n,]+/).map((item) => item.trim()).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)));
      setResult({ mode, finalDate: start < end ? end : start, businessDays: countBusinessDays(start, end, includeEnd, holidays), duration });
      return;
    }
    setResult({ mode, finalDate: start < end ? end : start, duration });
  }

  return <main className={styles.page}>
    <nav className="advanced-nav">
      <a className="brand" href="/"><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>SnapURL</span></a>
      <a className="back-link" href="/">← Back to SnapURL</a>
      <div className="nav-actions"><ThemeToggle /></div>
    </nav>
    <header className="tool-hero"><div className="tool-hero-icon" aria-hidden="true">◷</div><h1>Date Calculator</h1><p>Compare dates, calculate a future or past date, and count business days.</p></header>

    <section className={styles.calculator} aria-label="Date Calculator">
      <div className={styles.modeTabs} role="group" aria-label="Calculation type">
        {modes.map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => { setMode(id); setResult(null); setMessage(""); }}>{label}</button>)}
      </div>
      <div className={styles.fields}>
        <div className={styles.dateField}>
          <label htmlFor="date-calculator-start">{mode === "business" ? "Start date" : "Start date and time"}</label>
          <div className={styles.dateInput}>
            <input id="date-calculator-start" ref={startInputRef} type={mode === "business" ? "date" : "datetime-local"} value={mode === "business" ? from.slice(0, 10) : from} onChange={(event) => setFrom(mode === "business" ? `${event.target.value}T00:00` : event.target.value)} />
            <button type="button" aria-label="Open start date calendar" title="Choose from calendar" onClick={() => openPicker(startInputRef)}>▦</button>
          </div>
        </div>
        {mode === "add" ? <>
          <label>Operation<select value={operation} onChange={(event) => setOperation(event.target.value)}><option value="add">Add</option><option value="subtract">Subtract</option></select></label>
          <label>Amount<input type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value)}>{durationUnits.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
        </> : <div className={styles.dateField}>
          <label htmlFor="date-calculator-end">End date{mode === "difference" ? " and time" : ""}</label>
          <div className={styles.dateInput}>
            <input id="date-calculator-end" ref={endInputRef} type={mode === "business" ? "date" : "datetime-local"} value={mode === "business" ? to.slice(0, 10) : to} onChange={(event) => setTo(mode === "business" ? `${event.target.value}T00:00` : event.target.value)} />
            <button type="button" aria-label="Open end date calendar" title="Choose from calendar" onClick={() => openPicker(endInputRef)}>▦</button>
          </div>
        </div>}
        {mode === "business" && <label className={styles.holidays}>Holidays to exclude <span>Optional · YYYY-MM-DD, one per line</span><textarea rows={3} value={holidayText} onChange={(event) => setHolidayText(event.target.value)} placeholder="2026-12-25" /></label>}
      </div>
      {mode !== "add" && <label className={styles.checkbox}><input type="checkbox" checked={includeEnd} onChange={(event) => setIncludeEnd(event.target.checked)} />Include the end date in the calculation</label>}
      <div className={styles.actions}><button className="gradient-action" type="button" onClick={calculate}>Calculate</button></div>
      {message && <p className={styles.message} role="status">{message}</p>}
    </section>

    {result && <section className={styles.results} aria-label="Calculation result" aria-live="polite">
      <div className={styles.resultHeading}>
        <div><span>{result.mode === "add" ? "Calculated final date" : includeEnd ? "Counted through" : "End date"}</span><h2>{formatDate(result.finalDate)}</h2></div>
        {result.mode === "business" && <div className={styles.businessCount}><strong>{new Intl.NumberFormat().format(result.businessDays)}</strong><span>business days</span></div>}
      </div>
      <div className={styles.metricColumns}>
        <Metrics title="Calendar difference" items={[["Years", result.duration.calendar.years], ["Months", result.duration.calendar.months], ["Days", result.duration.calendar.days], ["Hours", result.duration.calendar.hours], ["Minutes", result.duration.calendar.minutes], ["Seconds", result.duration.calendar.seconds]]} />
        <Metrics title="Total elapsed" items={[["Weeks", result.duration.total.weeks], ["Days", result.duration.total.days], ["Hours", result.duration.total.hours], ["Minutes", result.duration.total.minutes], ["Seconds", result.duration.total.seconds]]} />
      </div>
    </section>}
    <footer className="tool-page-footer">Date Calculator</footer>
  </main>;
}