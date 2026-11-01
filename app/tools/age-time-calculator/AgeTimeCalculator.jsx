"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "../../ThemeToggle";
import styles from "./AgeTimeCalculator.module.css";

const dayInMilliseconds = 86400000;
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function localDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDateTimeValue(date) {
  return `${localDateValue(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dateParts(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function daysInMonth(year, month) {
  const date = new Date(0);
  date.setUTCFullYear(year, month, 0);
  return date.getUTCDate();
}

function addCalendarMonths(date, months) {
  const absoluteMonth = date.year * 12 + date.month - 1 + months;
  const year = Math.floor(absoluteMonth / 12);
  const month = absoluteMonth % 12 + 1;
  const lastDay = daysInMonth(year, month);
  return { year, month, day: Math.min(date.day, lastDay) };
}

function utcDay(date) {
  const value = new Date(0);
  value.setUTCFullYear(date.year, date.month - 1, date.day);
  return value.getTime() / dayInMilliseconds;
}

function compareDates(first, second) {
  return utcDay(first) - utcDay(second);
}

function calculateAge(birthValue, targetValue) {
  const birth = dateParts(birthValue);
  const target = dateParts(targetValue);
  if (!birth || !target || compareDates(target, birth) < 0) return null;

  let years = target.year - birth.year;
  let anniversary = addCalendarMonths(birth, years * 12);
  if (compareDates(anniversary, target) > 0) {
    years -= 1;
    anniversary = addCalendarMonths(birth, years * 12);
  }

  let months = (target.year - anniversary.year) * 12 + target.month - anniversary.month;
  let completedMonths = addCalendarMonths(birth, years * 12 + months);
  if (compareDates(completedMonths, target) > 0) {
    months -= 1;
    completedMonths = addCalendarMonths(birth, years * 12 + months);
  }

  const days = compareDates(target, completedMonths);
  const totalDays = compareDates(target, birth);
  const birthdayThisYear = addCalendarMonths(birth, (target.year - birth.year) * 12);
  const nextBirthday = compareDates(birthdayThisYear, target) >= 0
    ? birthdayThisYear
    : addCalendarMonths(birth, (target.year - birth.year + 1) * 12);

  return {
    years,
    months,
    days,
    totalDays,
    totalMonths: years * 12 + months,
    totalHours: totalDays * 24,
    daysToBirthday: compareDates(nextBirthday, target),
  };
}

function dateTimeMilliseconds(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function calculateTimeDifference(startValue, endValue) {
  const start = dateTimeMilliseconds(startValue);
  const end = dateTimeMilliseconds(endValue);
  if (start === null || end === null || end < start) return null;

  const totalSeconds = Math.floor((end - start) / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  return {
    days: totalDays,
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
    seconds: totalSeconds % 60,
    totalDays: Math.floor((end - start) / dayInMilliseconds),
    totalHours,
    totalMinutes,
    totalSeconds,
  };
}

export default function AgeTimeCalculator() {
  const [birthDate, setBirthDate] = useState("");
  const [asOfDate, setAsOfDate] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [ageCalculated, setAgeCalculated] = useState(false);
  const [timeCalculated, setTimeCalculated] = useState(false);

  useEffect(() => {
    const now = new Date();
    setAsOfDate(localDateValue(now));
    setEndDateTime(localDateTimeValue(now));
    setStartDateTime(localDateTimeValue(new Date(now.getTime() - 3600000)));
  }, []);

  const age = ageCalculated ? calculateAge(birthDate, asOfDate) : null;
  const timeDifference = timeCalculated ? calculateTimeDifference(startDateTime, endDateTime) : null;

  return <main className={styles.page}>
    <nav className="advanced-nav">
      <a className="brand" href="/"><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>SnapURL</span></a>
      <a className="back-link" href="/">← Back to SnapURL</a>
      <div className="nav-actions"><ThemeToggle /></div>
    </nav>
    <header className="tool-hero">
      <div className="tool-hero-icon" aria-hidden="true">⌛</div>
      <h1>Age &amp; Time Calculator</h1>
      <p>Find your exact age or measure the time between two dates and times.</p>
    </header>

    <div className={styles.calculators}>
      <section className={styles.calculator} aria-labelledby="age-calculator-title">
        <h2 className={styles.cardTitle} id="age-calculator-title">Age Calculator</h2>
        <p className={styles.cardDescription}>Calculate your exact age and see how long until your next birthday.</p>
        <div className={styles.fields}>
          <label htmlFor="age-birth-date">Date of birth
            <input id="age-birth-date" type="date" value={birthDate} max={asOfDate || undefined} onChange={(event) => { setBirthDate(event.target.value); setAgeCalculated(false); }} />
          </label>
          <label htmlFor="age-as-of-date">Calculate age on
            <input id="age-as-of-date" type="date" value={asOfDate} onChange={(event) => { setAsOfDate(event.target.value); setAgeCalculated(false); }} />
          </label>
        </div>
        <div className={styles.actions}><button className="gradient-action" type="button" onClick={() => setAgeCalculated(true)}>Calculate Age</button></div>
        {ageCalculated && !age && <p className={styles.message} role="alert">Choose a valid date of birth that is not after the calculation date.</p>}
        {age && <section className={styles.results} aria-live="polite">
          <div className={styles.resultHeading}>
            <div><span>Exact age</span><h2>{number.format(age.years)} years, {number.format(age.months)} months, {number.format(age.days)} days</h2></div>
          </div>
          <dl className={styles.metrics}>
            <div><dt>Total months</dt><dd>{number.format(age.totalMonths)}</dd></div>
            <div><dt>Total weeks</dt><dd>{number.format(Math.floor(age.totalDays / 7))}</dd></div>
            <div><dt>Total days</dt><dd>{number.format(age.totalDays)}</dd></div>
            <div><dt>Total hours</dt><dd>{number.format(age.totalHours)}</dd></div>
            <div><dt>Next birthday in</dt><dd>{number.format(age.daysToBirthday)} days</dd></div>
          </dl>
        </section>}
      </section>

      <section className={styles.calculator} aria-labelledby="time-calculator-title">
        <h2 className={styles.cardTitle} id="time-calculator-title">Time Calculator</h2>
        <p className={styles.cardDescription}>Measure the elapsed time between two dates and times.</p>
        <div className={styles.fields}>
          <label htmlFor="time-start">Start date &amp; time
            <input id="time-start" type="datetime-local" value={startDateTime} onChange={(event) => { setStartDateTime(event.target.value); setTimeCalculated(false); }} />
          </label>
          <label htmlFor="time-end">End date &amp; time
            <input id="time-end" type="datetime-local" value={endDateTime} onChange={(event) => { setEndDateTime(event.target.value); setTimeCalculated(false); }} />
          </label>
        </div>
        <div className={styles.actions}><button className="gradient-action" type="button" onClick={() => setTimeCalculated(true)}>Calculate Time</button></div>
        {timeCalculated && !timeDifference && <p className={styles.message} role="alert">Choose an end date and time that is not before the start.</p>}
        {timeDifference && <section className={styles.results} aria-live="polite">
          <div className={styles.resultHeading}>
            <div><span>Time difference</span><h2>{number.format(timeDifference.days)} days, {number.format(timeDifference.hours)} hours, {number.format(timeDifference.minutes)} minutes, {number.format(timeDifference.seconds)} seconds</h2></div>
          </div>
          <dl className={styles.metrics}>
            <div><dt>Total days</dt><dd>{number.format(timeDifference.totalDays)}</dd></div>
            <div><dt>Total hours</dt><dd>{number.format(timeDifference.totalHours)}</dd></div>
            <div><dt>Total minutes</dt><dd>{number.format(timeDifference.totalMinutes)}</dd></div>
            <div><dt>Total seconds</dt><dd>{number.format(timeDifference.totalSeconds)}</dd></div>
          </dl>
        </section>}
      </section>
    </div>
    <footer className="tool-page-footer">Age &amp; Time Calculator · Calculations use the selected dates and local time</footer>
  </main>;
}
