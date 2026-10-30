export const GRADE_SCALE = [
  { letter: 'A',  gpa: 4.0,  min: 95, max: 100, trad: 'Отлично' },
  { letter: 'A-', gpa: 3.67, min: 90, max: 94,  trad: 'Отлично' },
  { letter: 'B+', gpa: 3.33, min: 85, max: 89,  trad: 'Хорошо' },
  { letter: 'B',  gpa: 3.0,  min: 80, max: 84,  trad: 'Хорошо' },
  { letter: 'B-', gpa: 2.67, min: 75, max: 79,  trad: 'Хорошо' },
  { letter: 'C+', gpa: 2.33, min: 70, max: 74,  trad: 'Хорошо' },
  { letter: 'C',  gpa: 2.0,  min: 65, max: 69,  trad: 'Удовлетворительно' },
  { letter: 'C-', gpa: 1.67, min: 60, max: 64,  trad: 'Удовлетворительно' },
  { letter: 'D+', gpa: 1.33, min: 55, max: 59,  trad: 'Удовлетворительно' },
  { letter: 'D',  gpa: 1.0,  min: 50, max: 54,  trad: 'Удовлетворительно' },
  { letter: 'FX', gpa: 0.5,  min: 25, max: 49,  trad: 'Неудовлетворительно' },
  { letter: 'F',  gpa: 0,    min: 0,  max: 24,  trad: 'Неудовлетворительно' },
]

export const SCENARIOS = [
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

export const EMPTY_SUBJECT_DATA = {
  scenario: 'all',
  grades: { tk1: {}, tk2: {} },
  rkInput: { rk1: '', rk2: '' },
  exam: '',
  courseCompleted: false,
  fullAttendance: false,
  allTasksOnTime: false,
}

export function parseScore(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return null
  const score = Number(text)
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null
}

export function normalizeCell(value) {
  const text = String(value ?? '').trim()
  const status = text.toLowerCase().replaceAll('.', '')
  if (status === 'нп' || status === 'np') return 'нп'
  if (status === 'ня' || status === 'nya') return 'ня'
  const score = parseScore(text)
  return score === null ? text : String(score)
}

export function getGrade(score) {
  // Регламент не задаёт округление: пороги проверяются до округления для показа.
  return GRADE_SCALE.find(g => score >= g.min) || GRADE_SCALE.at(-1)
}

export function computeResults(subject, period) {
  const sc = SCENARIOS.find(s => s.id === subject.scenario) || SCENARIOS[0]
  const sem = period === 'semester'
  const weeks1 = sem ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5]
  const weeks2 = sem ? [8, 9, 10, 11, 12, 13, 14, 15] : [6, 7, 8, 9, 10]
  const counts = {}
  const invalidCells = []
  let hasZero = false
  const avg = (p, weeks, key) => {
    const values = []
    for (const week of weeks) {
      const value = normalizeCell(subject.grades[p]?.[week]?.[key])
      if (value === 'нп') continue
      const score = value === '' || value === 'ня' ? 0 : parseScore(value)
      if (score === null) invalidCells.push({ period: p, week, key })
      values.push(score ?? 0)
      if (score === 0) hasZero = true
    }
    counts[key] = (counts[key] || 0) + values.length
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
  }
  const tkTotal = (p, weeks) => sc.types.reduce((sum, t) => sum + t.c * avg(p, weeks, t.key), 0)
  const tk1 = tkTotal('tk1', weeks1)
  const tk2 = tkTotal('tk2', weeks2)
  const rk1 = parseScore(subject.rkInput.rk1) ?? 0
  const rk2 = parseScore(subject.rkInput.rk2) ?? 0
  const p1 = 0.7 * tk1 + 0.3 * rk1
  const p2 = 0.7 * tk2 + 0.3 * rk2
  const rd = (p1 + p2) / 2
  const inputsValid = invalidCells.length === 0 &&
    [subject.rkInput.rk1, subject.rkInput.rk2].every(v => v === '' || parseScore(v) !== null)
  const conditions = [
    { label: 'РК1 > 0', ok: rk1 > 0, value: rk1 },
    { label: 'РК2 > 0', ok: rk2 > 0, value: rk2 },
    { label: '(РК1+РК2)/2 ≥ 50', ok: (rk1 + rk2) / 2 >= 50, value: ((rk1 + rk2) / 2).toFixed(1) },
    { label: 'РД ≥ 50', ok: rd >= 50, value: rd.toFixed(1) },
    { label: 'Завершены все виды занятий', ok: subject.courseCompleted === true, value: subject.courseCompleted === true ? 'Да' : 'Нет' },
    { label: 'Оценки введены корректно', ok: inputsValid, value: inputsValid ? 'Да' : 'Нет' },
  ]
  const admitted = conditions.every(c => c.ok)
  const examVal = parseScore(subject.exam)
  const hasExam = admitted && examVal !== null
  const io = hasExam ? 0.6 * rd + 0.4 * examVal : null
  const grade = io === null ? null : getGrade(io)
  const autoEligible = admitted && rk1 >= 50 && rk2 >= 50 &&
    subject.fullAttendance === true && subject.allTasksOnTime === true && !hasZero
  const assessmentCounts = sc.types.map(t => {
    const count = counts[t.key] + (t.key === 'lecture' ? Number(parseScore(subject.rkInput.rk1) !== null) + Number(parseScore(subject.rkInput.rk2) !== null) : 0)
    const expected = { lecture: 4, practice: 10, lab: 10, srop: 2 }[t.key]
    const minimum = t.key === 'practice' || t.key === 'lab'
    return { key: t.key, label: t.label, count, expected, minimum, ok: minimum ? count >= expected : count === expected }
  })
  return { tk1, tk2, rk1, rk2, p1, p2, rd, conditions, admitted, examVal, hasExam, io, grade, autoEligible, assessmentCounts, invalidCells, sc, weeks1, weeks2 }
}
