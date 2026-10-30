import test from 'node:test'
import assert from 'node:assert/strict'
import { SCENARIOS, EMPTY_SUBJECT_DATA, computeResults, getGrade, normalizeCell, parseScore } from './calculations.js'
import { analyzeSubject, generateCSV, generateHTMLReport, parseImportCSV } from './reports.js'

function subject(score = 80, scenario = 'all', period = 'semester') {
  const s = structuredClone({ id: 1, name: 'Математика', ...EMPTY_SUBJECT_DATA,
    scenario, courseCompleted: true, rkInput: { rk1: '80', rk2: '80' }, exam: '80' })
  const { sc, weeks1, weeks2 } = computeResults(s, period)
  for (const [p, weeks] of [['tk1', weeks1], ['tk2', weeks2]]) {
    for (const w of weeks) s.grades[p][w] = Object.fromEntries(sc.types.map(t => [t.key, String(score)]))
  }
  return s
}

for (const [scenario, expected] of [['all', 77], ['noLab', 76], ['noPractice', 81], ['onlyPractice', 70], ['onlyLecture', 80]]) {
  test(`Таблица 1: коэффициенты ${scenario}`, () => {
    const s = subject(0, scenario)
    const marks = { lecture: '90', practice: '70', lab: '80', srop: '70' }
    for (const p of ['tk1', 'tk2']) for (const w in s.grades[p]) s.grades[p][w] = { ...marks }
    // onlyPractice: 0.9×70 + 0.1×70; all: 18+21+24+14.
    assert.equal(computeResults(s, 'semester').tk1, expected)
    assert.equal(SCENARIOS.find(sc => sc.id === scenario).types.reduce((sum, t) => sum + t.c, 0), 1)
  })
}

test('Р1, Р2, РД и ИО по формулам регламента', () => {
  const s = subject()
  s.rkInput = { rk1: '60', rk2: '100' }
  s.exam = '90'
  const r = computeResults(s, 'semester')
  assert.equal(r.p1, 74)
  assert.equal(r.p2, 86)
  assert.equal(r.rd, 80)
  assert.equal(r.io, 84)
})

test('РК1=1, РК2=99: допуск разрешён без порога 25', () => {
  const s = subject()
  s.rkInput = { rk1: '1', rk2: '99' }
  assert.equal(computeResults(s, 'semester').admitted, true)
})

test('Нулевой РК блокирует допуск при втором РК=100', () => {
  for (const rkInput of [{ rk1: '0', rk2: '100' }, { rk1: '100', rk2: '0' }]) {
    assert.equal(computeResults({ ...subject(100), rkInput }, 'semester').admitted, false)
  }
})

test('Среднее РК и РД проверяются без округления', () => {
  const s = subject(100)
  s.rkInput = { rk1: '49.9', rk2: '50' }
  assert.equal(computeResults(s, 'semester').admitted, false)
  const boundary = subject(50)
  boundary.rkInput = { rk1: '50', rk2: '50' }
  assert.equal(computeResults(boundary, 'semester').admitted, true)
  boundary.grades.tk1[1].lecture = '49.9'
  assert.equal(computeResults(boundary, 'semester').admitted, false)
})

test('Завершение всех видов занятий требуется отдельно', () => {
  assert.equal(computeResults({ ...subject(100), courseCompleted: false }, 'semester').admitted, false)
  assert.equal(computeResults({ ...subject(100), courseCompleted: undefined }, 'semester').admitted, false)
})

test('НЯ и пустая ячейка = 0; НП исключается из знаменателя', () => {
  const s = subject(100, 'onlyPractice')
  s.grades.tk1 = {
    1: { practice: '100', srop: '100' },
    2: { practice: 'Н.Я.', srop: 'нп' },
    3: { practice: '', srop: 'нп' },
    4: { practice: 'нп', srop: 'нп' },
    5: { practice: 'NP', srop: 'нп' },
    6: { practice: 'н.п.', srop: 'нп' },
    7: { practice: 'НП', srop: 'нп' },
  }
  assert.equal(computeResults(s, 'semester').tk1, 40)
  delete s.grades.tk1[3].practice
  assert.equal(computeResults(s, 'semester').tk1, 40)
  assert.ok(analyzeSubject(s, 'semester').lowGrades.some(g => g.week === 2 && g.value === 0))
})

test('Строгая проверка оценок и десятичная запятая', () => {
  assert.equal(normalizeCell(' 75,5 '), '75.5')
  assert.equal(normalizeCell(' Н.Я. '), 'ня')
  assert.equal(normalizeCell('Н.П.'), 'нп')
  assert.equal(normalizeCell(0), '0')
  for (const value of ['90abc', '-1', '101', 'Infinity', 'NaN', '', null, true]) assert.equal(parseScore(value), null)
  const s = subject()
  s.grades.tk1[1].lecture = '90abc'
  assert.equal(computeResults(s, 'semester').admitted, false)
  assert.equal(computeResults(s, 'semester').invalidCells.length, 1)
})

test('Пустой или неверный экзамен не превращается в итоговую оценку', () => {
  for (const exam of ['', 'NaN', '101', '-5']) {
    const r = computeResults({ ...subject(), exam }, 'semester')
    assert.equal(r.hasExam, false)
    assert.equal(r.io, null)
    assert.equal(r.grade, null)
  }
  assert.equal(computeResults({ ...subject(), exam: '0' }, 'semester').hasExam, true)
})

test('Автомат: оба РК≥50, посещаемость, сроки и отсутствие нулей', () => {
  const s = { ...subject(), fullAttendance: true, allTasksOnTime: true }
  assert.equal(computeResults(s, 'semester').autoEligible, true)
  for (const flag of ['fullAttendance', 'allTasksOnTime', 'courseCompleted']) {
    assert.equal(computeResults({ ...s, [flag]: false }, 'semester').autoEligible, false)
  }
  s.rkInput = { rk1: '49', rk2: '100' }
  assert.equal(computeResults(s, 'semester').autoEligible, false)
  s.rkInput.rk1 = '50'
  s.grades.tk1[1].lecture = 'ня'
  assert.equal(computeResults(s, 'semester').autoEligible, false)
  s.grades.tk1[1].lecture = 'нп'
  const r = computeResults(s, 'semester')
  assert.equal(r.autoEligible, true)
  assert.equal(computeResults({ ...s, exam: String(r.rd) }, 'semester').io, r.rd)
})

test('Шкала: D, C+ хорошо и точные границы без округления', () => {
  assert.equal(getGrade(50).letter, 'D')
  assert.equal(getGrade(49.99).letter, 'FX')
  assert.equal(getGrade(24.99).letter, 'F')
  assert.equal(getGrade(69.99).letter, 'C')
  assert.equal(getGrade(70).trad, 'Хорошо')
  assert.equal(getGrade(94.99).letter, 'A-')
  assert.equal(getGrade(95).letter, 'A')
})

test('Количество оценок: лекции включают два РК, НЯ считается нулевой оценкой', () => {
  const s = subject()
  for (const p of ['tk1', 'tk2']) {
    for (const w in s.grades[p]) {
      s.grades[p][w].lecture = 'нп'
      s.grades[p][w].srop = 'нп'
    }
  }
  s.grades.tk1[1] = { ...s.grades.tk1[1], lecture: 'ня', srop: '90' }
  s.grades.tk2[8] = { ...s.grades.tk2[8], lecture: '80', srop: '80' }
  const counts = computeResults(s, 'semester').assessmentCounts
  assert.deepEqual(counts.map(c => c.count), [4, 15, 15, 2])
  assert.ok(counts.every(c => c.ok))
})

test('Триместр: существующие границы недель сохранены', () => {
  const r = computeResults(subject(80, 'all', 'trimester'), 'trimester')
  assert.deepEqual(r.weeks1, [1, 2, 3, 4, 5])
  assert.deepEqual(r.weeks2, [6, 7, 8, 9, 10])
  assert.equal(r.io, 80)
})

test('CSV сохраняет статусы, подтверждения и результаты', () => {
  const s = { ...subject(), fullAttendance: true, allTasksOnTime: true }
  s.grades.tk1[1].lecture = 'ня'
  s.grades.tk1[2].lecture = 'нп'
  const [restored] = parseImportCSV(generateCSV([s], 'semester'))
  assert.equal(restored.courseCompleted, true)
  assert.equal(restored.fullAttendance, true)
  assert.equal(restored.allTasksOnTime, true)
  assert.deepEqual(restored.grades, s.grades)
  assert.equal(computeResults(restored, 'semester').io, computeResults(s, 'semester').io)
})

test('Старый CSV совместим; неизвестный сценарий безопасно заменяется', () => {
  const [s] = parseImportCSV('Предмет;Сценарий;Строка;Неделя;Лек;Практ;Лаб;СРОП\nТест;unknown;ТК1;1;НЯ;80;90;НП')
  assert.equal(s.scenario, 'all')
  assert.equal(s.courseCompleted, false)
  assert.equal(s.grades.tk1[1].lecture, 'ня')
  assert.equal(computeResults(s, 'semester').admitted, false)
})

test('HTML не обещает стипендию при неизвестном результате другого предмета', () => {
  const html = generateHTMLReport([subject(), { ...subject(), name: '<Тест>', exam: '' }], 'semester', '#007AFF')
  assert.ok(html.includes('Не все результаты известны'))
  assert.ok(html.includes('&lt;Тест&gt;'))
  assert.ok(!html.includes('РК1 >= 25'))
  assert.ok(html.includes('РК1 > 0') || html.includes('Условия автомата'))
  assert.ok(html.includes('не устанавливает условия назначения стипендии'))
})
