import { useState, useEffect, useRef } from 'react'
import './App.css'
import { GRADE_SCALE, SCENARIOS, EMPTY_SUBJECT_DATA, computeResults, normalizeCell, parseScore } from './calculations.js'
import { analyzeSubject, downloadFile, generateHTMLReport, generateCSV, parseImportCSV } from './reports.js'

const THEMES = [
  { id: 'blue',    name: 'Синий',       color: '#007AFF', color2: '#5856D6', light: 'rgba(0,122,255,0.12)',  ring: 'rgba(0,122,255,0.2)' },
  { id: 'purple',  name: 'Фиолетовый', color: '#AF52DE', color2: '#5856D6', light: 'rgba(175,82,222,0.12)', ring: 'rgba(175,82,222,0.2)' },
  { id: 'indigo',  name: 'Индиго',      color: '#5856D6', color2: '#AF52DE', light: 'rgba(88,86,214,0.12)',  ring: 'rgba(88,86,214,0.2)' },
  { id: 'teal',    name: 'Бирюзовый',  color: '#5AC8FA', color2: '#34C759', light: 'rgba(90,200,250,0.12)',  ring: 'rgba(90,200,250,0.2)' },
  { id: 'green',   name: 'Зелёный',    color: '#34C759', color2: '#5AC8FA', light: 'rgba(52,199,89,0.12)',   ring: 'rgba(52,199,89,0.2)' },
  { id: 'orange',  name: 'Оранжевый',  color: '#FF9500', color2: '#FF3B30', light: 'rgba(255,149,0,0.12)',   ring: 'rgba(255,149,0,0.2)' },
  { id: 'red',     name: 'Красный',     color: '#FF3B30', color2: '#FF9500', light: 'rgba(255,59,48,0.12)',   ring: 'rgba(255,59,48,0.2)' },
  { id: 'pink',    name: 'Розовый',     color: '#FF2D55', color2: '#AF52DE', light: 'rgba(255,45,85,0.12)',   ring: 'rgba(255,45,85,0.2)' },
]

export default function App() {
  const [period, setPeriod] = useState(() => {
    try { return localStorage.getItem('calc-period') || 'semester' } catch { return 'semester' }
  })

  const [subjects, setSubjects] = useState(() => {
    try {
      const saved = localStorage.getItem('calc-subjects')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* Повреждённое или недоступное хранилище: начальные данные ниже. */ }
    return [{ id: 1, name: 'Предмет 1', ...EMPTY_SUBJECT_DATA }]
  })

  const [activeId, setActiveId] = useState(() => {
    try {
      const saved = localStorage.getItem('calc-activeId')
      if (saved) return +saved
    } catch { /* При недоступном хранилище выбирается первый предмет. */ }
    return 1
  })

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('calc-theme') || 'blue' } catch { return 'blue' }
  })

  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('calc-mode') || 'light' } catch { return 'light' }
  })

  const [showSettings, setShowSettings] = useState(false)
  const fileInputRef = useRef(null)

  const toggleMode = () => setMode(m => m === 'light' ? 'dark' : 'light')

  // Apply theme + mode
  useEffect(() => {
    const t = THEMES.find(th => th.id === theme) || THEMES[0]
    const root = document.documentElement
    root.style.setProperty('--blue', t.color)
    root.style.setProperty('--blue-light', t.light)
    root.style.setProperty('--accent-1', t.color)
    root.style.setProperty('--accent-2', t.color2)
    root.style.setProperty('--focus-ring', t.ring)
    root.classList.toggle('dark', mode === 'dark')
  }, [theme, mode])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('calc-period', period)
      localStorage.setItem('calc-subjects', JSON.stringify(subjects))
      localStorage.setItem('calc-activeId', String(activeId))
      localStorage.setItem('calc-theme', theme)
      localStorage.setItem('calc-mode', mode)
    } catch { /* Калькулятор работает и без сохранения в хранилище браузера. */ }
  }, [period, subjects, activeId, theme, mode])

  const active = subjects.find(s => s.id === activeId) || subjects[0]
  const r = computeResults(active, period)

  const updateActive = (fn) =>
    setSubjects(subs => subs.map(s => s.id === active.id ? fn(s) : s))

  const setG = (p, w, key, val) =>
    updateActive(s => ({
      ...s,
      grades: {
        ...s.grades,
        [p]: { ...s.grades[p], [w]: { ...s.grades[p]?.[w], [key]: val } },
      },
    }))

  const handleCellBlur = (p, w, key) => {
    const val = active.grades[p]?.[w]?.[key]
    if (val === undefined || val === '') return
    const normalized = normalizeCell(val)
    if (normalized !== val) setG(p, w, key, normalized)
  }

  const cellDisplay = (v) => v === 'нп' ? 'н.п.' : v === 'ня' ? 'н.я.' : (v ?? '')

  const setRk = (key, val) =>
    updateActive(s => ({ ...s, rkInput: { ...s.rkInput, [key]: val } }))

  const setExam = (val) =>
    updateActive(s => ({ ...s, exam: val }))

  const setScenario = (val) =>
    updateActive(s => ({ ...s, scenario: val }))

  const setSubjectName = (val) =>
    updateActive(s => ({ ...s, name: val }))

  const resetActive = () =>
    updateActive(s => ({ ...s, ...EMPTY_SUBJECT_DATA, scenario: s.scenario }))

  const addSubject = () => {
    const id = Date.now()
    const name = `Предмет ${subjects.length + 1}`
    setSubjects(s => [...s, { id, name, ...EMPTY_SUBJECT_DATA }])
    setActiveId(id)
  }

  const removeSubject = (id) => {
    if (subjects.length <= 1) return
    const filtered = subjects.filter(s => s.id !== id)
    setSubjects(filtered)
    if (activeId === id) setActiveId(filtered[0].id)
  }

  const switchPeriod = (p) => {
    setPeriod(p)
    setSubjects(subs => subs.map(s => ({
      ...s,
      ...EMPTY_SUBJECT_DATA,
      scenario: s.scenario,
    })))
  }

  // Stipend calculation
  const allResults = subjects.map(s => ({
    name: s.name, id: s.id, exam: s.exam,
    ...computeResults(s, period),
  }))
  const hasFailure = allResults.some(s => s.hasExam && s.io < 70)
  const stipend = allResults.length > 0 && allResults.every(s => s.hasExam && s.io >= 70)

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0]

  const handleExportHTML = () => {
    const html = generateHTMLReport(subjects, period, currentTheme.color)
    downloadFile(html, 'stipend-report.html', 'text/html;charset=utf-8')
  }

  const handleExportCSV = () => {
    const csv = generateCSV(subjects, period)
    downloadFile(csv, 'grades-data.csv', 'text/csv;charset=utf-8')
  }

  const handleImportCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const imported = parseImportCSV(text)
      if (imported && imported.length > 0) {
        setSubjects(imported)
        setActiveId(imported[0].id)
      } else {
        alert('Не удалось распознать данные в CSV файле. Убедитесь, что файл имеет правильный формат.')
      }
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const periodsUI = [
    { key: 'tk1', weeks: r.weeks1, rkKey: 'rk1', rkLabel: 'РК1', tkVal: r.tk1, pVal: r.p1, title: 'Период 1 (ТК1)' },
    { key: 'tk2', weeks: r.weeks2, rkKey: 'rk2', rkLabel: 'РК2', tkVal: r.tk2, pVal: r.p2, title: 'Период 2 (ТК2)' },
  ]

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <span className="nav-logo">АУЭС</span>
          <span className="nav-sep" />
          <span className="nav-title">Калькулятор оценок</span>
        </div>
        <div className="nav-right">
          <button className="nav-btn" onClick={() => setShowSettings(true)} title="Настройки">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button className="nav-btn mode-toggle" onClick={toggleMode} title={mode === 'light' ? 'Тёмная тема' : 'Светлая тема'}>
            {mode === 'light'
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            }
          </button>
        </div>
      </nav>

      {/* Hero Banner */}
      <header className="hero-banner">
        <img
          className="hero-img"
          src="https://i.pinimg.com/originals/0a/d7/35/0ad735f722522d9a424b2a018ff63319.gif"
          alt="АУЭС"
          onError={e => { e.target.style.display = 'none' }}
        />
        <div className="hero-dim" />
        <div className="hero-overlay">
          <h1>Калькулятор оценок</h1>
          <p className="hero-sub">Удобный расчёт рейтинга, итоговой оценки и стипендии</p>
          <span className="hero-author">by Anuar Lukpanov | Сиб-24-7Б</span>
        </div>
      </header>

      <main className="main">
        {/* ===== Subject Tabs ===== */}
        <div className="subjects-bar">
          <div className="subjects-tabs">
            {subjects.map(s => (
              <div
                key={s.id}
                className={`subject-tab ${s.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(s.id)}
              >
                <span className="subject-tab-name">{s.name}</span>
                {subjects.length > 1 && (
                  <button
                    className="subject-tab-remove"
                    onClick={e => { e.stopPropagation(); removeSubject(s.id) }}
                    title="Удалить предмет"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button className="subject-add" onClick={addSubject} title="Добавить предмет">
              +
            </button>
          </div>
        </div>

        {/* toolbar removed — settings in navbar, export/import at bottom */}

        {/* ===== Subject Config ===== */}
        <section className="card subject-config">
          <div className="subject-name-row">
            <label className="subject-name-label" htmlFor="subj-name">Предмет</label>
            <input
              id="subj-name"
              className="subject-name-input"
              type="text"
              value={active.name}
              onChange={e => setSubjectName(e.target.value)}
              placeholder="Введите название предмета"
            />
          </div>
          <div className="scenarios-section">
            <span className="scenarios-label">Занятия</span>
            <div className="scenarios-list">
              {SCENARIOS.map(s => {
                const on = active.scenario === s.id
                return (
                  <button
                    key={s.id}
                    className={`sc-card ${on ? 'active' : ''}`}
                    onClick={() => setScenario(s.id)}
                  >
                    <span className="sc-card-name">{s.name}</span>
                    <span className="sc-card-desc">{s.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ===== NP Hint ===== */}
        <div className="np-hint">
          Расчёт за весь выбранный период: пустые ячейки и <strong>НЯ</strong> считаются нулём.
          <strong> НП</strong> исключает неделю без запланированного оценивания. Будущие недели делают результат предварительным.
          Введите оценки 0–100; просроченные оценки оставляйте нулевыми.
        </div>

        {/* ===== Grade Input Periods ===== */}
        <div className="grid-2">
          {periodsUI.map(pr => (
            <section key={pr.key} className="card period-card">
              <div className="card-head">
                <h2>{pr.title}</h2>
                <span className="tag">
                  Нед. {pr.weeks[0]}–{pr.weeks[pr.weeks.length - 1]}
                </span>
              </div>

              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="th-wk">Нед</th>
                      {r.sc.types.map(t => (
                        <th key={t.key}>
                          <span>{t.label}</span>
                          <small className="th-coeff">{t.c}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pr.weeks.map(w => (
                      <tr key={w}>
                        <td className="td-wk">{w}</td>
                        {r.sc.types.map(t => {
                          const raw = active.grades[pr.key]?.[w]?.[t.key]
                          const normalized = normalizeCell(raw)
                          const isNpVal = normalized === 'нп'
                          const invalid = normalized !== '' && !['нп', 'ня'].includes(normalized) && parseScore(normalized) === null
                          return (
                            <td key={t.key}>
                              <input
                                aria-label={`${pr.title}, неделя ${w}, ${t.label}`}
                                aria-invalid={invalid}
                                title={invalid ? "Введите 0–100, НП или НЯ" : "0–100, НП или НЯ"}
                                type="text"
                                inputMode="text"
                                value={cellDisplay(raw)}
                                onChange={e => setG(pr.key, w, t.key, e.target.value)}
                                onBlur={() => handleCellBlur(pr.key, w, t.key)}
                                placeholder="—"
                                className={`cell-input ${isNpVal ? 'is-np' : ''}`}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rk-row">
                <div className="rk-label">
                  <span className="rk-name">{pr.rkLabel}</span>
                  <span className="rk-hint">Рубежный контроль</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  aria-label={pr.rkLabel}
                  step="any"
                  value={active.rkInput[pr.rkKey]}
                  onChange={e => setRk(pr.rkKey, e.target.value)}
                  placeholder="0–100"
                  className="rk-input"
                />
              </div>

              <div className="period-foot">
                <div className="pf-item">
                  <span className="pf-label">ТК общ</span>
                  <span className="pf-value">{pr.tkVal.toFixed(1)}</span>
                </div>
                <div className="pf-divider" />
                <div className="pf-item">
                  <span className="pf-label">Рейтинг (P)</span>
                  <span className="pf-value">{pr.pVal.toFixed(1)}</span>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* ===== Results ===== */}
        <section className="card results-card">
          <h2>Результаты — {active.name}</h2>

          <div className="res-grid">
            <div className="res-box">
              <span className="rb-label">ТК1 общ</span>
              <span className="rb-value">{r.tk1.toFixed(1)}</span>
            </div>
            <div className="res-box">
              <span className="rb-label">ТК2 общ</span>
              <span className="rb-value">{r.tk2.toFixed(1)}</span>
            </div>
            <div className="res-box">
              <span className="rb-label">P1</span>
              <span className="rb-value">{r.p1.toFixed(1)}</span>
              <span className="rb-formula">0.7 * ТК1 + 0.3 * РК1</span>
            </div>
            <div className="res-box">
              <span className="rb-label">P2</span>
              <span className="rb-value">{r.p2.toFixed(1)}</span>
              <span className="rb-formula">0.7 * ТК2 + 0.3 * РК2</span>
            </div>
          </div>

          {/* РД Progress */}
          <div className="rd-section">
            <div className="rd-top">
              <div>
                <span className="rd-title">Рейтинг допуска (РД)</span>
                <span className="rd-formula">(P1 + P2) / 2</span>
              </div>
              <span className={`rd-val ${r.rd >= 50 ? 'good' : 'bad'}`}>
                {r.rd.toFixed(1)}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, r.rd))}%`,
                  background: r.rd >= 50
                    ? 'linear-gradient(90deg, #34C759, #30D158)'
                    : 'linear-gradient(90deg, #FF3B30, #FF453A)',
                }}
              />
              <div className="progress-mark" style={{ left: '50%' }} />
            </div>
            <div className="progress-labels">
              <span>0</span>
              <span className="progress-threshold">50</span>
              <span>100</span>
            </div>
          </div>

          {/* Admission Conditions */}
          <div className="admission">
            <h3>Допуск к экзамену</h3>
            <label className="regulation-check">
              <input type="checkbox" checked={active.courseCompleted === true}
                onChange={e => updateActive(s => ({ ...s, courseCompleted: e.target.checked }))} />
              Завершены все виды занятий по дисциплине
            </label>
            <div className="cond-list">
              {r.conditions.map(c => (
                <div key={c.label} className={`cond ${c.ok ? 'ok' : 'no'}`}>
                  <span className="cond-icon">{c.ok ? '✓' : '✗'}</span>
                  <span className="cond-text">{c.label}</span>
                  <span className="cond-val">= {c.value}</span>
                </div>
              ))}
            </div>
            <div className={`admission-badge ${r.admitted ? 'yes' : 'no'}`}>
              {r.admitted ? 'Допущен к экзамену' : 'Не допущен к экзамену'}
            </div>
          </div>

          <div className="admission">
            <h3>Экзамен автоматом</h3>
            <label className="regulation-check">
              <input type="checkbox" checked={active.fullAttendance === true}
                onChange={e => updateActive(s => ({ ...s, fullAttendance: e.target.checked }))} />
              Посещаемость 100%
            </label>
            <label className="regulation-check">
              <input type="checkbox" checked={active.allTasksOnTime === true}
                onChange={e => updateActive(s => ({ ...s, allTasksOnTime: e.target.checked }))} />
              Все задания выполнены в срок
            </label>
            <p className="regulation-note">Нужны допуск, РК1 и РК2 ≥ 50, отсутствие нулей за задания.
              Автомат выставляет преподаватель; при несогласии можно сдать экзамен.</p>
            <button className="btn-primary" disabled={!r.autoEligible}
              onClick={() => setExam(String(r.rd))}>
              Принять автомат от преподавателя (ИК = РД)
            </button>
          </div>

          <details className="regulation-note">
            <summary>Количество оценок и сроки по регламенту</summary>
            <ul>
              {r.assessmentCounts.map(c => (
                <li key={c.key}>{c.label}: {c.count} / {c.minimum ? 'не менее ' : ''}{c.expected}
                  {c.key === 'lecture' ? ' (включая РК1 и РК2)' : ''}
                  {c.ok ? ' ✓' : ' — проверьте журнал и отметки НП'}</li>
              ))}
            </ul>
            <p>Нормы указаны за семестр. ТК — до 23:59 среды следующей недели;
              РК — до 23:59 субботы рубежной недели по академическому календарю.
              Не выставленная в срок оценка и НЯ учитываются как 0; НП не входит в среднее.</p>
            <p>FX: одна пересдача экзамена без повторного изучения дисциплины.
              F: повторное изучение дисциплины. Апелляция — в течение 24 часов после выставления оценки.</p>
          </details>

          {/* Exam */}
          {r.admitted && (
            <div className="exam-section">
              <h3>Итоговый контроль (Экзамен)</h3>
              <div className="exam-row">
                <label htmlFor="exam-input">Оценка за экзамен (ИК)</label>
                <input
                  id="exam-input"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={active.exam}
                  onChange={e => setExam(e.target.value)}
                  placeholder="0–100"
                  className="exam-input"
                />
              </div>

              {active.exam !== '' && r.examVal === null && (
                <p role="alert">Оценка за экзамен должна быть числом от 0 до 100.</p>
              )}

              {r.hasExam && (
                <div className="final-section">
                  <p className="final-formula">
                    ИО = 0.6 × {r.rd.toFixed(1)} + 0.4 × {r.examVal} ={' '}
                    <strong>{r.io.toFixed(1)}</strong>
                  </p>
                  <div className="final-display">
                    <div
                      className={`grade-circle ${r.grade.min >= 50 ? 'pass' : 'fail'}`}
                    >
                      <span className="gc-letter">{r.grade.letter}</span>
                      <span className="gc-gpa">GPA {r.grade.gpa}</span>
                    </div>
                    <div className="grade-meta">
                      <span className="gm-score">
                        {r.io.toFixed(1)} баллов
                      </span>
                      <span className="gm-trad">{r.grade.trad}</span>
                    </div>
                  </div>

                  <div className={`stipend-inline ${r.io >= 70 ? 'ok' : 'no'}`}>
                    <span className="stipend-inline-icon">{r.io >= 70 ? '✓' : '✗'}</span>
                    <span>
                      {r.io >= 70
                        ? 'Порог ИО ≥ 70 выполнен'
                        : 'Порог ИО ≥ 70 не выполнен'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ===== Stipend Summary ===== */}
        {subjects.length > 0 && (
          <section className="card stipend-card">
            <div className="card-head">
              <h2>Стипендия — Сводка</h2>
            </div>
            <p className="stipend-hint">
              Ориентировочная проверка ИО ≥ 70 по всем предметам. Условия назначения стипендии в приложенном регламенте не установлены.
            </p>

            <div className="stipend-list">
              {allResults.map(s => {
                const hasExam = s.hasExam
                const ok = hasExam && s.io >= 70
                const analysis = analyzeSubject(
                  subjects.find(sub => sub.id === s.id),
                  period,
                )
                return (
                  <div
                    key={s.id}
                    className={`stipend-item ${!hasExam ? 'pending' : ok ? 'ok' : 'no'}`}
                    onClick={() => setActiveId(s.id)}
                  >
                    <span className="stipend-item-icon">
                      {!hasExam ? '—' : ok ? '✓' : '✗'}
                    </span>
                    <div className="stipend-item-info">
                      <span className="stipend-item-name">{s.name}</span>
                      <span className="stipend-item-score">
                        {hasExam
                          ? `ИО: ${s.io.toFixed(1)} — ${s.grade.letter} (${s.grade.trad})`
                          : s.admitted
                            ? 'Экзамен не введён'
                            : 'Не допущен к экзамену'}
                      </span>
                      {!ok && analysis.admitted && (
                        <span className="stipend-item-req">
                          {analysis.examPossible
                            ? `Мин. экзамен для стипендии: ${Math.max(0, analysis.reqExam)}`
                            : 'Нужно повысить РД'}
                          {analysis.lowGrades.length > 0 &&
                            ` | Исправить: ${analysis.lowGrades.length} оц.`}
                        </span>
                      )}
                    </div>
                    {hasExam && (
                      <span className={`stipend-item-badge ${ok ? 'ok' : 'no'}`}>
                        {ok ? '>= 70' : '< 70'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className={`stipend-badge ${stipend ? 'yes' : hasFailure ? 'no' : 'pending'}`}>
              {stipend ? 'Порог 70 выполнен по всем предметам'
                : hasFailure ? 'Есть предметы с ИО ниже 70'
                  : 'Не все результаты известны'}
            </div>
          </section>
        )}

        {/* ===== Grade Scale ===== */}
        <section className="card">
          <h2>Шкала оценок</h2>
          <div className="scale-grid">
            {GRADE_SCALE.map(g => (
              <div
                key={g.letter}
                className={`scale-item ${
                  r.hasExam && r.grade.letter === g.letter
                    ? 'active'
                    : ''
                }`}
              >
                <span className="si-letter">{g.letter}</span>
                <span className="si-range">{g.min}–{g.max}</span>
                <span className="si-gpa">{g.gpa}</span>
                <span className="si-trad">{g.trad}</span>
              </div>
            ))}
          </div>
        </section>
        {/* ===== Export / Import ===== */}
        <section className="card io-card">
          <div className="card-head">
            <h2>Экспорт / Импорт</h2>
          </div>
          <p className="io-hint">Экспортируйте данные для отчёта или сохраните копию. Импорт загрузит оценки из CSV-файла.</p>
          <div className="io-buttons">
            <button className="btn-export" onClick={handleExportHTML} title="Скачать HTML отчёт">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              HTML
            </button>
            <button className="btn-export" onClick={handleExportCSV} title="Скачать CSV данные">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
            <button className="btn-import" onClick={() => fileInputRef.current?.click()} title="Загрузить CSV">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Импорт CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImportCSV}
            />
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Создано на основе предоставленного регламента АУЭС им. Гумарбека Даукеева, 2026</p>
      </footer>

      {/* ===== Settings Modal ===== */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Настройки</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="setting-row">
                <span className="setting-label">Режим</span>
                <div className="seg">
                  <button className={mode === 'light' ? 'active' : ''} onClick={() => setMode('light')}>
                    Светлый
                  </button>
                  <button className={mode === 'dark' ? 'active' : ''} onClick={() => setMode('dark')}>
                    Тёмный
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <span className="setting-label">Цветовая тема</span>
                <div className="theme-picker">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      className={`theme-dot ${theme === t.id ? 'active' : ''}`}
                      style={{ background: t.color }}
                      onClick={() => setTheme(t.id)}
                      title={t.name}
                    />
                  ))}
                </div>
              </div>

              <div className="setting-row">
                <span className="setting-label">Период обучения</span>
                <div className="seg">
                  <button
                    className={period === 'semester' ? 'active' : ''}
                    onClick={() => switchPeriod('semester')}
                  >
                    Семестр
                  </button>
                  <button
                    className={period === 'trimester' ? 'active' : ''}
                    onClick={() => switchPeriod('trimester')}
                  >
                    Триместр
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-ghost" onClick={resetActive}>
                  Сбросить оценки
                </button>
                <button className="btn-primary" onClick={() => setShowSettings(false)}>
                  Готово
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
