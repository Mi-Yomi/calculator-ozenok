import { SCENARIOS, computeResults, getWeeks, migrateSemesterWeeks, normalizeCell, parseScore } from './calculations.js'

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function analyzeSubject(subject, period) {
  const r = computeResults(subject, period)
  const sc = r.sc
  const { weeks1, weeks2 } = getWeeks(period)

  const hasExam = r.hasExam
  const io = hasExam ? r.io : null
  const onStipend = io !== null && io >= 70

  const reqExam = r.rd > 0 ? Math.ceil((70 - 0.6 * r.rd) / 0.4) : 100
  const examPossible = reqExam <= 100

  const lowGrades = []
  const checkP = (pKey, weeks, pNum) => {
    weeks.forEach(w => {
      sc.types.forEach(t => {
        const val = subject.grades[pKey]?.[w]?.[t.key]
        const normalized = normalizeCell(val)
        if (normalized === '' || normalized === 'нп') return
        const num = normalized === 'ня' ? 0 : parseScore(normalized)
        if (num !== null && num < 70) {
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
    admitted: r.admitted, onStipend, reqExam, examPossible, lowGrades, autoEligible: r.autoEligible,
  }
}

export function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function generateHTMLReport(subjects, period, themeColor) {
  const analyses = subjects.map(s => analyzeSubject(s, period))
  const withExam = analyses.filter(a => a.hasExam)
  const allOk = analyses.length > 0 && analyses.every(a => a.hasExam && a.onStipend)
  const hasFailure = withExam.some(a => !a.onStipend)

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
        lines.push(`<p style="color:#FF3B30"><strong>Студент не допущен к экзамену.</strong> Необходимо завершить все виды занятий, корректно ввести оценки и выполнить условия: РК1 > 0, РК2 > 0, среднее РК ≥ 50, РД ≥ 50.</p>`)
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
  <p>Условия автомата: ${a.autoEligible ? "выполнены; решение принимает преподаватель" : "не выполнены"}.</p>
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
  <span class="badge ${allOk ? 'badge-ok' : hasFailure ? 'badge-no' : 'badge-pending'}">${allOk ? 'Порог 70 выполнен по всем предметам' : hasFailure ? 'Есть предметы с ИО ниже 70' : 'Не все результаты известны'}</span>
</div>

<p>Ориентировочная проверка порога 70; регламент 2026 года не устанавливает условия назначения стипендии. Пустые ячейки и НП исключены из расчёта; НЯ и явно введённый 0 учитываются как ноль. До завершения дисциплины результат предварительный.</p>
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

export function generateCSV(subjects, period) {
  const sep = ';'
  const { weeks1, weeks2 } = getWeeks(period)
  const allTypes = ['lecture', 'practice', 'lab', 'srop']
  const header = ['Предмет','Сценарий','Строка','Неделя','Лек','Практ','Лаб','СРОП','Все занятия завершены','Посещаемость 100%','Задания в срок']

  const rows = []
  subjects.forEach(subject => {
    const s = { ...subject, confirmations: [subject.courseCompleted === true, subject.fullAttendance === true, subject.allTasksOnTime === true] }
    weeks1.forEach(w => {
      const vals = allTypes.map(t => s.grades.tk1?.[w]?.[t] ?? '')
      rows.push([s.name, s.scenario, 'ТК1', w, ...vals, ...s.confirmations])
    })
    rows.push([s.name, s.scenario, 'РК1', '', s.rkInput.rk1, '', '', '', ...s.confirmations])
    weeks2.forEach(w => {
      const vals = allTypes.map(t => s.grades.tk2?.[w]?.[t] ?? '')
      rows.push([s.name, s.scenario, 'ТК2', w, ...vals, ...s.confirmations])
    })
    rows.push([s.name, s.scenario, 'РК2', '', s.rkInput.rk2, '', '', '', ...s.confirmations])
    rows.push([s.name, s.scenario, 'Экзамен', '', s.exam, '', '', '', ...s.confirmations])
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

export function parseImportCSV(text, period = 'semester') {
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
  const completedI = idx(['все занятия завершены'])
  const attendanceI = idx(['посещаемость 100%'])
  const tasksI = idx(['задания в срок'])
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
        scenario: SCENARIOS.some(s => s.id === cols[scenI]?.trim()) ? cols[scenI].trim() : 'all',
        grades: { tk1: {}, tk2: {} },
        rkInput: { rk1: '', rk2: '' },
        exam: '',
      })
    }

    const subj = subjectsMap.get(name)
    subj.courseCompleted = cols[completedI]?.trim() === 'true'
    subj.fullAttendance = cols[attendanceI]?.trim() === 'true'
    subj.allTasksOnTime = cols[tasksI]?.trim() === 'true'
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
          if (v) target[w][key] = normalizeCell(v)
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

  const result = Array.from(subjectsMap.values(), s => migrateSemesterWeeks(s, period))
  return result.length > 0 ? result : null
}
