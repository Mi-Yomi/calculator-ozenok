import { useState, useEffect, useRef } from 'react'
import './App.css'

const GRADE_SCALE = [
  { letter: 'A',  gpa: 4.0,  min: 95, max: 100, trad: 'Отлично' },
  { letter: 'A-', gpa: 3.67, min: 90, max: 94,  trad: 'Отлично' },
  { letter: 'B+', gpa: 3.33, min: 85, max: 89,  trad: 'Хорошо' },
  { letter: 'B',  gpa: 3.0,  min: 80, max: 84,  trad: 'Хорошо' },
  { letter: 'B-', gpa: 2.67, min: 75, max: 79,  trad: 'Хорошо' },
  { letter: 'C+', gpa: 2.33, min: 70, max: 74,  trad: 'Удовлетворительно' },
  { letter: 'C',  gpa: 2.0,  min: 65, max: 69,  trad: 'Удовлетворительно' },
  { letter: 'C-', gpa: 1.67, min: 60, max: 64,  trad: 'Удовлетворительно' },
  { letter: 'D+', gpa: 1.33, min: 55, max: 59,  trad: 'Удовлетворительно' },
  { letter: 'D-', gpa: 1.0,  min: 50, max: 54,  trad: 'Удовлетворительно' },
  { letter: 'FX', gpa: 0.5,  min: 25, max: 49,  trad: 'Неудовлетворительно' },
  { letter: 'F',  gpa: 0,    min: 0,  max: 24,  trad: 'Неудовлетворительно' },
]

const SCENARIOS = [
  {
    id: 'all',
    name: 'Все виды занятий',
    desc: 'Лекции + Практика + Лаб + СРОП',
    types: [
      { key: 'lecture', label: 'Лек', c: 0.2 },
      { key: 'practice', label: 'Практ', c: 0.3 },
      { key: 'lab', label: 'Лаб', c: 0.3 },
      { key: 'srop', label: 'СРОП', c: 0.2 },
    ],
  },
  {
    id: 'noLab',
    name: 'Без лабораторных',
    desc: 'Лекции + Практика + СРОП',
    types: [
      { key: 'lecture', label: 'Лек', c: 0.3 },
      { key: 'practice', label: 'Практ', c: 0.5 },
      { key: 'srop', label: 'СРОП', c: 0.2 },
    ],
  },
  {
    id: 'noPractice',
    name: 'Без практики',
    desc: 'Лекции + Лаб + СРОП',
    types: [
      { key: 'lecture', label: 'Лек', c: 0.3 },
      { key: 'lab', label: 'Лаб', c: 0.5 },
      { key: 'srop', label: 'СРОП', c: 0.2 },
    ],
  },
  {
    id: 'onlyPractice',
    name: 'Без лекций и лаб',
    desc: 'Практика + СРОП',
    types: [
      { key: 'practice', label: 'Практ', c: 0.9 },
      { key: 'srop', label: 'СРОП', c: 0.1 },
    ],
  },
  {
    id: 'onlyLecture',
    name: 'Без практики и лаб',
    desc: 'Лекции + СРОП',
    types: [
      { key: 'lecture', label: 'Лек', c: 0.5 },
      { key: 'srop', label: 'СРОП', c: 0.5 },
    ],
  },
]

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

const EMPTY_SUBJECT_DATA = {
  scenario: 'all',
  grades: { tk1: {}, tk2: {} },
  rkInput: { rk1: '', rk2: '' },
  exam: '',
}

function getGrade(score) {
  const r = Math.round(score)
  return GRADE_SCALE.find(g => r >= g.min && r <= g.max) || GRADE_SCALE[GRADE_SCALE.length - 1]
}

function isNp(v) {
  if (typeof v !== 'string') return false
  const n = v.trim().toLowerCase()
  return n === 'нп' || n === 'np' || n === 'н.п.' || n === 'н.п'
}

function normalizeCell(v) {
  if (typeof v !== 'string' || v.trim() === '') return ''
  if (isNp(v)) return 'нп'
  const num = parseFloat(v)
  if (!isNaN(num)) return String(Math.min(100, Math.max(0, num)))
  return v
}

function computeResults(subject, period) {
  const sc = SCENARIOS.find(s => s.id === subject.scenario)
  const sem = period === 'semester'
  const weeks1 = sem ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5]
  const weeks2 = sem ? [8, 9, 10, 11, 12, 13, 14, 15] : [6, 7, 8, 9, 10]

  const avg = (p, weeks, key) => {
    const v = weeks
      .map(w => subject.grades[p]?.[w]?.[key])
      .filter(x => x !== undefined && x !== '' && x !== 'нп' && !isNaN(x))
      .map(Number)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
  }

  const tkTotal = (p, weeks) =>
    sc.types.reduce((sum, t) => sum + t.c * avg(p, weeks, t.key), 0)

  const tk1 = tkTotal('tk1', weeks1)
  const tk2 = tkTotal('tk2', weeks2)
  const rk1 = subject.rkInput.rk1 === '' ? 0 : Math.min(100, Math.max(0, +subject.rkInput.rk1))
  const rk2 = subject.rkInput.rk2 === '' ? 0 : Math.min(100, Math.max(0, +subject.rkInput.rk2))
  const p1 = 0.7 * tk1 + 0.3 * rk1
  const p2 = 0.7 * tk2 + 0.3 * rk2
  const rd = (p1 + p2) / 2

  const conditions = [
    { label: 'РК1 >= 25', ok: rk1 >= 25, value: rk1 },
    { label: 'РК2 >= 25', ok: rk2 >= 25, value: rk2 },
    { label: '(РК1+РК2)/2 >= 50', ok: (rk1 + rk2) / 2 >= 50, value: ((rk1 + rk2) / 2).toFixed(1) },
    { label: 'РД >= 50', ok: rd >= 50, value: rd.toFixed(1) },
  ]
  const admitted = conditions.every(c => c.ok)

  const examVal = subject.exam === '' ? 0 : Math.min(100, Math.max(0, +subject.exam))
  const io = 0.6 * rd + 0.4 * examVal
  const grade = getGrade(io)

  return { tk1, tk2, rk1, rk2, p1, p2, rd, conditions, admitted, examVal, io, grade, sc, weeks1, weeks2 }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function analyzeSubject(subject, period) {
  const r = computeResults(subject, period)
  const sc = SCENARIOS.find(s => s.id === subject.scenario)
  const sem = period === 'semester'
  const weeks1 = sem ? [1,2,3,4,5,6,7] : [1,2,3,4,5]
  const weeks2 = sem ? [8,9,10,11,12,13,14,15] : [6,7,8,9,10]

  const hasExam = subject.exam !== '' && r.admitted
  const io = hasExam ? r.io : null
  const onStipend = io !== null && io >= 70

  const reqExam = r.rd > 0 ? Math.ceil((70 - 0.6 * r.rd) / 0.4) : 100
  const examPossible = reqExam <= 100

  const lowGrades = []
  const checkP = (pKey, weeks, pNum) => {
    weeks.forEach(w => {
      sc.types.forEach(t => {
        const val = subject.grades[pKey]?.[w]?.[t.key]
        if (val === 'нп' || val === undefined || val === '') return
        const num = Number(val)
        if (!isNaN(num) && num < 70) {
          lowGrades.push({ week: w, type: t.label, typeKey: t.key, value: num, period: pNum })
        }
      })
    })
  }
  checkP('tk1', weeks1, 1)
  checkP('tk2', weeks2, 2)

  return {
    name: subject.name, rd: r.rd, rk1: r.rk1, rk2: r.rk2,
    tk1: r.tk1, tk2: r.tk2, p1: r.p1, p2: r.p2,
    hasExam, examVal: r.examVal, io, grade: r.grade,
    admitted: r.admitted, onStipend, reqExam, examPossible, lowGrades,
  }
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function generateHTMLReport(subjects, period, themeColor) {
  const analyses = subjects.map(s => analyzeSubject(s, period))
  const withExam = analyses.filter(a => a.hasExam)
  const hasAny = withExam.length > 0
  const allOk = hasAny && withExam.every(a => a.onStipend)

  const subjectSections = analyses.map(a => {
    const needsWork = a.hasExam && !a.onStipend
    const noExam = !a.hasExam

    let recs = ''
    if (needsWork || noExam) {
      const lines = []
      if (a.admitted) {
        if (a.examPossible) {
          lines.push(`<p><strong>Минимальный балл за экзамен для стипендии:</strong> <span style="color:${themeColor};font-size:18px;font-weight:700">${Math.max(0, a.reqExam)}</span> из 100</p>`)
        } else {
          lines.push(`<p style="color:#FF3B30"><strong>Невозможно получить ИО >= 70 даже с максимальным баллом за экзамен (100).</strong></p>`)
          lines.push(`<p>Текущий РД: ${a.rd.toFixed(1)}. Необходимо повысить РД минимум до ${((70 - 40) / 0.6).toFixed(1)} для стипендии при экзамене = 100.</p>`)
        }
      } else {
        lines.push(`<p style="color:#FF3B30"><strong>Студент не допущен к экзамену.</strong> Необходимо выполнить условия допуска (РК1 >= 25, РК2 >= 25, среднее РК >= 50, РД >= 50).</p>`)
      }

      if (a.lowGrades.length > 0) {
        lines.push(`<h4 style="margin:12px 0 8px">Недели с оценками ниже 70 (рекомендуется исправить):</h4>`)
        lines.push(`<table><thead><tr><th>Период</th><th>Неделя</th><th>Тип</th><th>Текущая</th><th>Рекомендуется</th></tr></thead><tbody>`)
        a.lowGrades.forEach(g => {
          lines.push(`<tr class="low-grade"><td>ТК${g.period}</td><td>${g.week}</td><td>${escHtml(g.type)}</td><td style="color:#FF3B30;font-weight:600">${g.value}</td><td style="color:#34C759;font-weight:600">70+</td></tr>`)
        })
        lines.push(`</tbody></table>`)
      }

      recs = `<div class="recommendation">${lines.join('\n')}</div>`
    }

    return `<div class="subject-section">
  <h2>${escHtml(a.name)}</h2>
  <div class="metrics">
    <div class="metric"><span class="metric-value">${a.rd.toFixed(1)}</span><span class="metric-label">РД</span></div>
    <div class="metric"><span class="metric-value">${a.hasExam ? a.examVal : '—'}</span><span class="metric-label">Экзамен</span></div>
    <div class="metric"><span class="metric-value ${a.hasExam ? (a.io >= 70 ? 'ok' : 'bad') : ''}">${a.hasExam ? a.io.toFixed(1) : '—'}</span><span class="metric-label">ИО</span></div>
    <div class="metric"><span class="metric-value">${a.hasExam ? a.grade.letter : '—'}</span><span class="metric-label">Оценка</span></div>
    <div class="metric"><span class="metric-value ${a.hasExam ? (a.onStipend ? 'ok' : 'bad') : ''}">${a.hasExam ? (a.onStipend ? 'Да' : 'Нет') : '—'}</span><span class="metric-label">Стипендия</span></div>
  </div>
  ${recs}
</div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Отчёт по стипендии — АУЭС</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1c1c1e;line-height:1.6}
h1{font-size:28px;color:${themeColor};margin-bottom:4px}
h2{font-size:20px;margin:28px 0 14px;padding-bottom:8px;border-bottom:2px solid ${themeColor}}
h3{font-size:17px;margin:16px 0 8px}
h4{font-size:15px;color:#1c1c1e}
.subtitle{color:#6e6e73;font-size:14px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px}
th{padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6e6e73;border-bottom:2px solid #e5e5ea}
td{padding:8px 12px;border-bottom:1px solid #e5e5ea}
tr:last-child td{border-bottom:none}
.ok{color:#34C759;font-weight:600}
.bad{color:#FF3B30;font-weight:600}
.badge{display:inline-block;padding:8px 20px;border-radius:20px;font-weight:600;font-size:16px}
.badge-ok{background:rgba(52,199,89,.1);color:#34C759}
.badge-no{background:rgba(255,59,48,.1);color:#FF3B30}
.badge-pending{background:#f2f2f7;color:#6e6e73}
.recommendation{background:#FFFCE8;border-left:4px solid #FFCC00;padding:14px 18px;margin:16px 0;border-radius:0 8px 8px 0}
.recommendation p{margin:6px 0}
.summary-box{padding:20px;background:#f2f2f7;border-radius:12px;margin:20px 0;text-align:center}
.metrics{display:flex;gap:16px;flex-wrap:wrap;margin:12px 0}
.metric{flex:1;min-width:80px;text-align:center;padding:12px;background:#f2f2f7;border-radius:10px}
.metric-value{display:block;font-size:22px;font-weight:700}
.metric-label{display:block;font-size:11px;color:#6e6e73;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
.low-grade{background:rgba(255,59,48,.04)}
.subject-section{margin-bottom:32px;page-break-inside:avoid}
.author{font-size:12px;color:#aeaeb2;margin-top:40px;text-align:center;border-top:1px solid #e5e5ea;padding-top:16px}
@media print{body{padding:20px}h2{page-break-before:auto}.subject-section{page-break-inside:avoid}}
</style>
</head>
<body>
<h1>Отчёт по стипендии</h1>
<p class="subtitle">АУЭС им. Г. Даукеева | ${new Date().toLocaleDateString('ru-RU')} | Автор калькулятора: Anuar Lukpanov Сиб-24-7Б</p>

<div class="summary-box">
  <span class="badge ${allOk ? 'badge-ok' : hasAny ? 'badge-no' : 'badge-pending'}">${allOk ? 'Студент остаётся на стипендии' : hasAny ? 'Студент теряет стипендию' : 'Нет данных для расчёта'}</span>
</div>

<h2 style="border-bottom-color:${themeColor}">Сводка</h2>
<table>
<thead><tr><th>Предмет</th><th>РД</th><th>Экзамен</th><th>ИО</th><th>Оценка</th><th>Стипендия</th><th>Мин. экзамен</th></tr></thead>
<tbody>
${analyses.map(a => `<tr>
<td><strong>${escHtml(a.name)}</strong></td>
<td>${a.rd.toFixed(1)}</td>
<td>${a.hasExam ? a.examVal : '—'}</td>
<td class="${a.hasExam ? (a.io >= 70 ? 'ok' : 'bad') : ''}">${a.hasExam ? a.io.toFixed(1) : '—'}</td>
<td>${a.hasExam ? a.grade.letter : '—'}</td>
<td>${a.hasExam ? (a.onStipend ? '<span class="ok">Да</span>' : '<span class="bad">Нет</span>') : '—'}</td>
<td>${a.admitted ? (a.examPossible ? Math.max(0, a.reqExam) : 'Невозможно') : 'Не допущен'}</td>
</tr>`).join('\n')}
</tbody>
</table>

${subjectSections}

<p class="author">Сгенерировано калькулятором оценок АУЭС</p>
</body>
</html>`
}

function generateCSV(subjects, period) {
  const sep = ';'
  const sem = period === 'semester'
  const weeks1 = sem ? [1,2,3,4,5,6,7] : [1,2,3,4,5]
  const weeks2 = sem ? [8,9,10,11,12,13,14,15] : [6,7,8,9,10]
  const allTypes = ['lecture', 'practice', 'lab', 'srop']
  const header = ['Предмет','Сценарий','Строка','Неделя','Лек','Практ','Лаб','СРОП']

  const rows = []
  subjects.forEach(s => {
    weeks1.forEach(w => {
      const vals = allTypes.map(t => s.grades.tk1?.[w]?.[t] ?? '')
      rows.push([s.name, s.scenario, 'ТК1', w, ...vals])
    })
    rows.push([s.name, s.scenario, 'РК1', '', s.rkInput.rk1, '', '', ''])
    weeks2.forEach(w => {
      const vals = allTypes.map(t => s.grades.tk2?.[w]?.[t] ?? '')
      rows.push([s.name, s.scenario, 'ТК2', w, ...vals])
    })
    rows.push([s.name, s.scenario, 'РК2', '', s.rkInput.rk2, '', '', ''])
    rows.push([s.name, s.scenario, 'Экзамен', '', s.exam, '', '', ''])
  })

  const bom = '\uFEFF'
  const csvRows = [
    header.map(h => `"${h}"`).join(sep),
    ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(sep))
  ]
  return bom + csvRows.join('\n')
}

function parseCSVLine(line, sep) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else current += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === sep) { result.push(current); current = '' }
      else current += ch
    }
  }
  result.push(current)
  return result
}

function parseImportCSV(text) {
  const content = text.replace(/^\uFEFF/, '')
  const firstLine = content.split('\n')[0]
  const sep = firstLine.includes(';') ? ';' : ','
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null

  const header = parseCSVLine(lines[0], sep).map(h => h.trim().toLowerCase())
  const idx = (keywords) => header.findIndex(h => keywords.some(k => h.includes(k)))
  const nameI = idx(['предмет'])
  const scenI = idx(['сценарий'])
  const typeI = idx(['строка'])
  const weekI = idx(['неделя'])
  const lekI = idx(['лек'])
  const practI = idx(['практ'])
  const labI = idx(['лаб'])
  const sropI = idx(['сроп'])
  if (nameI === -1) return null

  const subjectsMap = new Map()
  let counter = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep)
    const name = cols[nameI]?.trim()
    if (!name) continue

    if (!subjectsMap.has(name)) {
      subjectsMap.set(name, {
        id: Date.now() + (++counter),
        name,
        scenario: cols[scenI]?.trim() || 'all',
        grades: { tk1: {}, tk2: {} },
        rkInput: { rk1: '', rk2: '' },
        exam: '',
      })
    }

    const subj = subjectsMap.get(name)
    const rowType = cols[typeI]?.trim()
    const week = cols[weekI]?.trim()

    if (scenI >= 0 && cols[scenI]?.trim()) {
      const sc = cols[scenI].trim()
      if (SCENARIOS.find(s => s.id === sc)) subj.scenario = sc
    }

    const gradeRow = (target, w) => {
      if (!target[w]) target[w] = {}
      const set = (i, key) => {
        if (i >= 0 && cols[i] !== undefined) {
          const v = cols[i].trim()
          if (v) target[w][key] = isNp(v) ? 'нп' : v
        }
      }
      set(lekI, 'lecture'); set(practI, 'practice'); set(labI, 'lab'); set(sropI, 'srop')
    }

    if (rowType === 'ТК1' && week) {
      const w = parseInt(week)
      if (!isNaN(w)) gradeRow(subj.grades.tk1, w)
    } else if (rowType === 'ТК2' && week) {
      const w = parseInt(week)
      if (!isNaN(w)) gradeRow(subj.grades.tk2, w)
    } else if (rowType === 'РК1') {
      subj.rkInput.rk1 = lekI >= 0 ? (cols[lekI]?.trim() || '') : ''
    } else if (rowType === 'РК2') {
      subj.rkInput.rk2 = lekI >= 0 ? (cols[lekI]?.trim() || '') : ''
    } else if (rowType === 'Экзамен') {
      subj.exam = lekI >= 0 ? (cols[lekI]?.trim() || '') : ''
    }
  }

  const result = Array.from(subjectsMap.values())
  return result.length > 0 ? result : null
}

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
    } catch {}
    return [{ id: 1, name: 'Предмет 1', ...EMPTY_SUBJECT_DATA }]
  })

  const [activeId, setActiveId] = useState(() => {
    try {
      const saved = localStorage.getItem('calc-activeId')
      if (saved) return +saved
    } catch {}
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
    } catch {}
  }, [period, subjects, activeId, theme, mode])

  const active = subjects.find(s => s.id === activeId) || subjects[0]
  const r = computeResults(active, period)

  const updateActive = (fn) =>
    setSubjects(subs => subs.map(s => s.id === activeId ? fn(s) : s))

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

  const cellDisplay = (v) => v === 'нп' ? 'н.п.' : (v ?? '')

  const setRk = (key, val) =>
    updateActive(s => ({ ...s, rkInput: { ...s.rkInput, [key]: val } }))

  const setExam = (val) =>
    updateActive(s => ({ ...s, exam: val }))

  const setScenario = (val) =>
    updateActive(s => ({ ...s, scenario: val }))

  const setSubjectName = (val) =>
    updateActive(s => ({ ...s, name: val }))

  const resetActive = () =>
    updateActive(s => ({ ...s, grades: { tk1: {}, tk2: {} }, rkInput: { rk1: '', rk2: '' }, exam: '' }))

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
      grades: { tk1: {}, tk2: {} },
      rkInput: { rk1: '', rk2: '' },
      exam: '',
    })))
  }

  // Stipend calculation
  const allResults = subjects.map(s => ({
    name: s.name, id: s.id, exam: s.exam,
    ...computeResults(s, period),
  }))
  const subjectsWithExam = allResults.filter(s => s.exam !== '' && s.admitted)
  const hasAnyExam = subjectsWithExam.length > 0
  const stipend = hasAnyExam && subjectsWithExam.every(s => s.io >= 70)

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
          Введите <strong>нп</strong> в ячейку для отметки «н.п.» (не предусмотрено) — такая оценка не влияет на расчёт
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
                          const isNpVal = raw === 'нп'
                          return (
                            <td key={t.key}>
                              <input
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
                  value={active.exam}
                  onChange={e => setExam(e.target.value)}
                  placeholder="0–100"
                  className="exam-input"
                />
              </div>

              {active.exam !== '' && (
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
                        {Math.round(r.io)} баллов
                      </span>
                      <span className="gm-trad">{r.grade.trad}</span>
                    </div>
                  </div>

                  <div className={`stipend-inline ${r.io >= 70 ? 'ok' : 'no'}`}>
                    <span className="stipend-inline-icon">{r.io >= 70 ? '✓' : '✗'}</span>
                    <span>
                      {r.io >= 70
                        ? 'Оценка достаточна для стипендии (ИО >= 70)'
                        : 'Оценка недостаточна для стипендии (ИО < 70)'}
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
              Для сохранения стипендии ИО по каждому предмету должна быть не ниже 70 баллов
            </p>

            <div className="stipend-list">
              {allResults.map(s => {
                const hasExam = s.exam !== '' && s.admitted
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

            <div className={`stipend-badge ${!hasAnyExam ? 'pending' : stipend ? 'yes' : 'no'}`}>
              {!hasAnyExam
                ? 'Введите оценки за экзамены для расчёта стипендии'
                : stipend
                  ? 'Студент остаётся на стипендии'
                  : 'Студент теряет стипендию'}
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
                  active.exam !== '' &&
                  r.admitted &&
                  Math.round(r.io) >= g.min &&
                  Math.round(r.io) <= g.max
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
        <p>Создано на основе регламента АУЭС им. Гумарбека Даукеева, 2025</p>
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
