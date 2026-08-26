import { useState, useEffect, useMemo } from 'react';
import {
  Target, ListChecks, ClipboardCheck, BarChart3,
  Plus, Pencil, Trash2, X, Check,
  CheckCircle2, Circle, ChevronLeft, ChevronRight,
  Sparkles, Bot, TrendingUp, Trophy, Flame,
  AlertTriangle, XCircle, RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

const TOTAL_WEEKS = 12;
const STORAGE_KEY = 'twelve-week-year-data-v1';

const uid = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// Читаем сохранённые данные из localStorage браузера.
// Если данных нет или они повреждены — возвращаем null, и компонент
// подставит демо-данные по умолчанию.
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.goals) || typeof parsed.completions !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

const pluralTactics = (n) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'тактика';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'тактики';
  return 'тактик';
};

const STATUS_META = {
  success: {
    key: 'success',
    label: 'Успешная неделя',
    text: 'text-emerald-400',
    solidBg: 'bg-emerald-500',
    solidText: 'text-neutral-950',
    ring: 'ring-emerald-500',
    hex: '#10b981',
    Icon: CheckCircle2,
  },
  caution: {
    key: 'caution',
    label: 'Нужно поднажать',
    text: 'text-amber-400',
    solidBg: 'bg-amber-400',
    solidText: 'text-neutral-950',
    ring: 'ring-amber-400',
    hex: '#fbbf24',
    Icon: AlertTriangle,
  },
  danger: {
    key: 'danger',
    label: 'Неделя провисает',
    text: 'text-rose-400',
    solidBg: 'bg-rose-500',
    solidText: 'text-neutral-50',
    ring: 'ring-rose-500',
    hex: '#f43f5e',
    Icon: XCircle,
  },
  neutral: {
    key: 'neutral',
    label: 'Ещё впереди',
    text: 'text-neutral-500',
    solidBg: 'bg-neutral-800',
    solidText: 'text-neutral-500',
    ring: 'ring-neutral-700',
    hex: '#27272a',
    Icon: Circle,
  },
};

const getStatusKey = (score) => (score >= 85 ? 'success' : score >= 50 ? 'caution' : 'danger');

const ADVICE_POOL = {
  success: [
    'Отличная неделя! {score}% выполнения — результат человека, который живёт по системе, а не по настроению. Именно такие недели, одна за другой, складываются в результат всего 12-недельного года. Сохраните тот же список тактик и попробуйте повторить результат ещё раз.',
    '{score}% — вы в зоне исполнения. Не цель двигает вас вперёд, а еженедельные действия, которые вы полностью контролируете. Запишите, что именно сработало на этой неделе — этот приём стоит повторить снова.',
    'Сильно сыграно: {score}%. Разрыв между вашим видением и реальностью на этой неделе оказался минимальным. Проверьте, не стали ли тактики слишком лёгкими — если да, пора поднять планку и добавить более амбициозное действие.',
    '{score}% выполнения — это дисциплина, а не удача. Регулярность в действиях, которые вы контролируете, определяет результат в конце периода. Зафиксируйте эту неделю как ориентир и постарайтесь удержать её ещё пару недель подряд.',
  ],
  caution: [
    '{score}% — рабочий, но не выдающийся результат. Между тем, что вы запланировали, и тем, что сделали, образовался разрыв. Возможно, одна из тактик слишком крупная — попробуйте разбить её на действие на 10–15 минут.',
    'На этой неделе {score}%. Идеальных недель не бывает — важнее то, что вы делаете дальше. Выберите тактику, которая срывалась чаще других, и на следующей неделе поставьте её первой в списке дня, а не последней.',
    '{score}% выполнения. Система проверяется на прочность именно в такие недели, а не в лёгкие. Возможно, тактик просто слишком много для текущей загрузки — лучше стабильно выполнять два действия, чем нестабильно четыре.',
    'Результат недели — {score}%. Это сигнал, а не приговор. Отметьте, в какие дни чаще всего срывались тактики, и заранее поставьте на эти дни короткое напоминание.',
  ],
  danger: [
    '{score}% — неделя не задалась, и это тоже часть процесса. Главное правило системы: прошлая неделя не определяет следующую. Оставьте на новую неделю всего 1–2 тактики — те, что реальны даже в плохой день.',
    'На этой неделе получилось {score}%. Прежде чем винить себя, спросите: тактики вообще были посильными? Низкий балл чаще говорит не о лени, а о плане, написанном без учёта реального графика. Упростите список и начните заново с понедельника.',
    '{score}% выполнения — сигнал притормозить и пересмотреть план, а не сигнал бросить цель. Оставьте одну самую важную тактику на следующую неделю и временно откажитесь от остальных, пока не вернёте ритм.',
    'Неделя с результатом {score}% случается у каждого, кто ставит перед собой настоящие цели. Система прощает провальную неделю, но не прощает отказ от неё. Разберите, что помешало — время, мотивация или сложность тактики — и скорректируйте именно это.',
  ],
};

const seedGoals = [
  {
    id: 'goal-python',
    title: 'Выучить Python',
    description: 'Освоить основы Python настолько, чтобы писать рабочие скрипты и автоматизировать рутинные задачи.',
    tactics: [
      { id: 'tac-1', text: 'Пройти 2 урока онлайн-курса по Python' },
      { id: 'tac-2', text: 'Писать код 30 минут каждый будний день' },
      { id: 'tac-3', text: 'Решить 3 практические задачи' },
    ],
  },
];

const seedCompletions = {
  1: { 'tac-1': true, 'tac-2': true, 'tac-3': false },
  2: { 'tac-1': true, 'tac-2': true, 'tac-3': true },
  3: { 'tac-1': true, 'tac-2': false, 'tac-3': false },
  4: { 'tac-1': true, 'tac-2': true, 'tac-3': false },
};

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
        active ? 'text-orange-500' : 'text-neutral-500'
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      {label}
    </button>
  );
}

function LedgerStrip({ weeksMeta, currentWeek, onSelect }) {
  return (
    <div className="grid grid-cols-12 gap-1">
      {weeksMeta.map((w) => {
        const meta = STATUS_META[w.statusKey];
        const isCurrent = w.week === currentWeek;
        return (
          <button
            key={w.week}
            type="button"
            onClick={() => onSelect(w.week)}
            title={`Неделя ${w.week}: ${w.elapsed ? w.score + '%' : 'ещё впереди'}`}
            className={`font-mono-score aspect-square flex items-center justify-center rounded-md text-xs font-semibold ${meta.solidBg} ${meta.solidText} ${
              isCurrent ? `ring-2 ring-offset-2 ring-offset-neutral-950 ${meta.ring}` : ''
            }`}
          >
            {w.week}
          </button>
        );
      })}
    </div>
  );
}

function ScoreTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const meta = STATUS_META[d.statusKey];
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-neutral-200">Неделя {label}</p>
      <p className={meta.text}>{d.elapsed ? `${d.score}% · ${meta.label}` : 'Ещё впереди'}</p>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <Icon className={`mb-2 h-5 w-5 ${accent}`} />
      <p className="font-mono-score text-2xl text-neutral-100">{value}</p>
      <p className="mt-1 text-xs leading-tight text-neutral-500">{label}</p>
    </div>
  );
}

export default function TwelveWeekYearApp() {
  // Ленивая инициализация: loadState() выполняется только один раз при первом
  // рендере, а не при каждом обновлении состояния.
  const [goals, setGoals] = useState(() => loadState()?.goals ?? seedGoals);
  const [completions, setCompletions] = useState(() => loadState()?.completions ?? seedCompletions);
  const [currentWeek, setCurrentWeek] = useState(() => loadState()?.currentWeek ?? 4);
  const [activeScreen, setActiveScreen] = useState('week');
  const [activeGoalId, setActiveGoalId] = useState(() => loadState()?.activeGoalId ?? seedGoals[0]?.id ?? null);
  const [goalForm, setGoalForm] = useState(null);
  const [tacticInput, setTacticInput] = useState('');
  const [advice, setAdvice] = useState(null);
  const [lastAdviceIdx, setLastAdviceIdx] = useState({});

  // Автосохранение: при любом изменении целей, тактик, отметок, недели или
  // выбранной цели — записываем всё одним объектом в localStorage браузера.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ goals, completions, currentWeek, activeGoalId })
      );
    } catch {
      // localStorage недоступен (например, приватный режим с отключённым
      // хранилищем) — молча игнорируем, приложение продолжит работать
      // без сохранения между визитами.
    }
  }, [goals, completions, currentWeek, activeGoalId]);

  const allTactics = useMemo(
    () => goals.flatMap((g) => g.tactics.map((t) => ({ ...t, goalId: g.id, goalTitle: g.title }))),
    [goals]
  );

  const weekScore = (week) => {
    if (allTactics.length === 0) return 0;
    const done = allTactics.filter((t) => completions[week]?.[t.id]).length;
    return Math.round((done / allTactics.length) * 100);
  };

  const currentScore = weekScore(currentWeek);
  const currentStatusKey = getStatusKey(currentScore);
  const currentMeta = STATUS_META[currentStatusKey];

  const weeksMeta = useMemo(
    () =>
      Array.from({ length: TOTAL_WEEKS }, (_, i) => {
        const week = i + 1;
        const elapsed = week <= currentWeek;
        const score = weekScore(week);
        return { week, elapsed, score, statusKey: elapsed ? getStatusKey(score) : 'neutral' };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentWeek, completions, allTactics]
  );

  const elapsedScores = weeksMeta.filter((w) => w.elapsed);
  const avgScore = elapsedScores.length
    ? Math.round(elapsedScores.reduce((sum, w) => sum + w.score, 0) / elapsedScores.length)
    : 0;
  const bestWeek = elapsedScores.reduce((best, w) => (w.score > (best?.score ?? -1) ? w : best), null);
  const successWeeksCount = elapsedScores.filter((w) => w.score >= 85).length;

  const selectedGoalId = goals.some((g) => g.id === activeGoalId) ? activeGoalId : goals[0]?.id ?? null;
  const selectedGoal = goals.find((g) => g.id === selectedGoalId) || null;

  const toggleTactic = (tacticId) => {
    setCompletions((prev) => ({
      ...prev,
      [currentWeek]: { ...prev[currentWeek], [tacticId]: !prev[currentWeek]?.[tacticId] },
    }));
  };

  const handleSaveGoal = (e) => {
    e.preventDefault();
    const title = goalForm.title.trim();
    if (!title) return;
    if (goalForm.id) {
      setGoals((gs) =>
        gs.map((g) => (g.id === goalForm.id ? { ...g, title, description: goalForm.description.trim() } : g))
      );
    } else {
      if (goals.length >= 3) return;
      const newGoal = { id: uid(), title, description: goalForm.description.trim(), tactics: [] };
      setGoals((gs) => [...gs, newGoal]);
      setActiveGoalId(newGoal.id);
    }
    setGoalForm(null);
  };

  const deleteGoal = (id) => {
    setGoals((gs) => gs.filter((g) => g.id !== id));
  };

  const addTactic = (e) => {
    e.preventDefault();
    const text = tacticInput.trim();
    if (!text || !selectedGoalId) return;
    setGoals((gs) =>
      gs.map((g) => (g.id === selectedGoalId ? { ...g, tactics: [...g.tactics, { id: uid(), text }] } : g))
    );
    setTacticInput('');
  };

  const deleteTactic = (goalId, tacticId) => {
    setGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, tactics: g.tactics.filter((t) => t.id !== tacticId) } : g)));
  };

  const requestAdvice = () => {
    const pool = ADVICE_POOL[currentStatusKey];
    let idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && idx === lastAdviceIdx[currentStatusKey]) {
      idx = (idx + 1) % pool.length;
    }
    setLastAdviceIdx((prev) => ({ ...prev, [currentStatusKey]: idx }));
    setAdvice({ statusKey: currentStatusKey, text: pool[idx].replace('{score}', currentScore) });
  };

  const changeWeek = (delta) => {
    setCurrentWeek((w) => Math.min(TOTAL_WEEKS, Math.max(1, w + delta)));
    setAdvice(null);
  };

  const selectWeek = (week) => {
    setCurrentWeek(week);
    setAdvice(null);
  };

  const resetAll = () => {
    const confirmed = window.confirm(
      'Это удалит все цели, тактики и отметки о выполнении без возможности восстановить. Начать новый 12-недельный год с чистого листа?'
    );
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    setGoals([]);
    setCompletions({});
    setCurrentWeek(1);
    setActiveGoalId(null);
    setAdvice(null);
    setActiveScreen('vision');
  };

  return (
    <div className="font-body min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="font-mono-score flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-neutral-950">
              12
            </div>
            <span className="font-display text-sm font-semibold uppercase tracking-wide text-neutral-300">
              Мой 12-недельный год
            </span>
          </div>
          <span className="font-mono-score rounded-full border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400">
            {currentWeek}/{TOTAL_WEEKS}
          </span>
        </header>

        <main className="flex-1 px-5 pb-28 pt-5">
          {activeScreen === 'vision' && (
            <section className="space-y-4">
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-widest text-orange-500">
                  12-недельный год
                </p>
                <h1 className="font-display text-2xl font-bold text-neutral-50">Видение и цели</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Выберите от 1 до 3 целей, ради которых стоит выложиться следующие 12 недель.
                </p>
              </div>

              <div className="space-y-3">
                {goals.map((g) => (
                  <div key={g.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-neutral-100">{g.title}</h3>
                        {g.description && <p className="mt-1 text-sm text-neutral-500">{g.description}</p>}
                        <p className="mt-2 text-xs text-neutral-600">
                          {g.tactics.length} {pluralTactics(g.tactics.length)} в плане
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => setGoalForm({ id: g.id, title: g.title, description: g.description })}
                          className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGoal(g.id)}
                          className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-800 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {goals.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center">
                    <Target className="mx-auto mb-2 h-6 w-6 text-neutral-600" />
                    <p className="text-sm text-neutral-500">Пока нет ни одной цели. Начните с самой важной.</p>
                  </div>
                )}
              </div>

              {goalForm && (
                <form onSubmit={handleSaveGoal} className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Название цели</label>
                    <input
                      autoFocus
                      value={goalForm.title}
                      onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Например: Выучить Python"
                      maxLength={60}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Описание</label>
                    <textarea
                      value={goalForm.description}
                      onChange={(e) => setGoalForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      maxLength={200}
                      placeholder="Почему эта цель важна и как выглядит результат"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-neutral-950"
                    >
                      <Check className="h-4 w-4" /> Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalForm(null)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-400"
                    >
                      <X className="h-4 w-4" /> Отмена
                    </button>
                  </div>
                </form>
              )}

              {!goalForm && goals.length < 3 && (
                <button
                  type="button"
                  onClick={() => setGoalForm({ title: '', description: '' })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-700 py-3 text-sm font-medium text-neutral-400 hover:border-orange-500 hover:text-orange-400"
                >
                  <Plus className="h-4 w-4" /> Добавить цель
                </button>
              )}
              {goals.length >= 3 && (
                <p className="text-center text-xs text-neutral-600">
                  Достигнут предел в 3 цели — это осознанный выбор фокуса.
                </p>
              )}
            </section>
          )}

          {activeScreen === 'tactics' && (
            <section className="space-y-4">
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-widest text-orange-500">Тактики</p>
                <h1 className="font-display text-2xl font-bold text-neutral-50">План действий</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Lead indicators — конкретные еженедельные действия, которые вы полностью контролируете.
                </p>
              </div>

              {goals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center">
                  <p className="mb-3 text-sm text-neutral-500">Сначала добавьте хотя бы одну цель.</p>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('vision')}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950"
                  >
                    Перейти к целям
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {goals.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveGoalId(g.id)}
                        className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                          selectedGoalId === g.id
                            ? 'border-orange-500 bg-orange-500 text-neutral-950'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                        }`}
                      >
                        {g.title}
                      </button>
                    ))}
                  </div>

                  {selectedGoal && (
                    <>
                      {selectedGoal.description && <p className="text-sm text-neutral-500">{selectedGoal.description}</p>}
                      <div className="space-y-2">
                        {selectedGoal.tactics.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
                          >
                            <span className="text-sm text-neutral-200">{t.text}</span>
                            <button
                              type="button"
                              onClick={() => deleteTactic(selectedGoal.id, t.id)}
                              className="flex-shrink-0 rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-800 hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {selectedGoal.tactics.length === 0 && (
                          <div className="rounded-xl border border-dashed border-neutral-800 p-5 text-center">
                            <ListChecks className="mx-auto mb-2 h-5 w-5 text-neutral-600" />
                            <p className="text-sm text-neutral-500">Добавьте первую тактику для этой цели.</p>
                          </div>
                        )}
                      </div>

                      <form onSubmit={addTactic} className="flex gap-2">
                        <input
                          value={tacticInput}
                          onChange={(e) => setTacticInput(e.target.value)}
                          placeholder="Например: Писать код 30 минут в день"
                          maxLength={80}
                          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          type="submit"
                          className="flex items-center justify-center rounded-lg bg-orange-500 px-4 text-neutral-950"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </form>
                      <p className="text-xs text-neutral-600">
                        Обычно достаточно 3–5 тактик на цель, чтобы удержать фокус на неделю.
                      </p>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {activeScreen === 'week' && (
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-xs font-semibold uppercase tracking-widest text-orange-500">
                    Неделя {currentWeek} из {TOTAL_WEEKS}
                  </p>
                  <h1 className="font-display text-2xl font-bold text-neutral-50">Чек-лист недели</h1>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => changeWeek(-1)}
                    disabled={currentWeek === 1}
                    className="rounded-lg border border-neutral-800 p-2 text-neutral-400 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeWeek(1)}
                    disabled={currentWeek === TOTAL_WEEKS}
                    className="rounded-lg border border-neutral-800 p-2 text-neutral-400 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <LedgerStrip weeksMeta={weeksMeta} currentWeek={currentWeek} onSelect={selectWeek} />

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Балл недели</p>
                    <p className="font-mono-score text-5xl font-bold text-neutral-50">{currentScore}%</p>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${currentMeta.solidBg} ${currentMeta.solidText}`}
                  >
                    <currentMeta.Icon className="h-3.5 w-3.5" /> {currentMeta.label}
                  </span>
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                  Правило 85%: неделя считается успешной, если выполнено 85% тактик и больше.
                </p>
              </div>

              {allTactics.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center">
                  <p className="mb-3 text-sm text-neutral-500">
                    Тактик пока нет — добавьте их, чтобы начать отслеживать неделю.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('tactics')}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950"
                  >
                    Перейти к тактикам
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {allTactics.map((t) => {
                    const checked = !!completions[currentWeek]?.[t.id];
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTactic(t.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left ${
                          checked ? 'border-emerald-800 bg-neutral-900' : 'border-neutral-800 bg-neutral-900'
                        }`}
                      >
                        {checked ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" />
                        )}
                        <span className="flex flex-col">
                          {goals.length > 1 && <span className="mb-0.5 text-xs text-neutral-500">{t.goalTitle}</span>}
                          <span className={checked ? 'text-neutral-500 line-through' : 'text-neutral-100'}>{t.text}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={requestAdvice}
                disabled={allTactics.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-500 py-3 text-sm font-semibold text-orange-400 disabled:opacity-30"
              >
                <Sparkles className="h-4 w-4" /> Получить совет ИИ-тренера
              </button>

              {advice && (
                <div className="flex gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                  <Bot className="h-5 w-5 flex-shrink-0 text-orange-400" />
                  <div>
                    <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${STATUS_META[advice.statusKey].text}`}>
                      ИИ-тренер
                    </p>
                    <p className="text-sm leading-relaxed text-neutral-300">{advice.text}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeScreen === 'dashboard' && (
            <section className="space-y-5">
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-widest text-orange-500">Аналитика</p>
                <h1 className="font-display text-2xl font-bold text-neutral-50">Дашборд</h1>
                <p className="mt-1 text-sm text-neutral-500">Прогресс по всем 12 неделям цикла.</p>
              </div>

              <LedgerStrip
                weeksMeta={weeksMeta}
                currentWeek={currentWeek}
                onSelect={(w) => {
                  selectWeek(w);
                  setActiveScreen('week');
                }}
              />

              <div className="flex gap-3">
                <StatTile icon={TrendingUp} label="Средний балл" value={`${avgScore}%`} accent="text-orange-400" />
                <StatTile
                  icon={Trophy}
                  label={bestWeek ? `Лучшая — неделя ${bestWeek.week}` : 'Лучшая неделя'}
                  value={bestWeek ? `${bestWeek.score}%` : '—'}
                  accent="text-amber-400"
                />
                <StatTile
                  icon={Flame}
                  label="Успешных недель"
                  value={`${successWeeksCount}/${elapsedScores.length || 0}`}
                  accent="text-rose-400"
                />
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <p className="mb-3 text-sm font-semibold text-neutral-300">Балл по неделям</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeksMeta} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="week" tick={{ fill: '#737373', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                    <ReferenceLine
                      y={85}
                      stroke="#fbbf24"
                      strokeDasharray="4 4"
                      label={{ value: '85%', position: 'insideTopRight', fill: '#fbbf24', fontSize: 10 }}
                    />
                    <Tooltip content={<ScoreTooltip />} cursor={{ fill: '#1f1f23' }} />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={28}>
                      {weeksMeta.map((w) => (
                        <Cell key={w.week} fill={STATUS_META[w.statusKey].hex} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <button
                type="button"
                onClick={resetAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-800 py-2.5 text-xs font-medium text-neutral-600 hover:border-rose-800 hover:text-rose-400"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Начать новый 12-недельный год (сбросить всё)
              </button>
            </section>
          )}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-neutral-800 bg-neutral-950 px-2">
          <NavButton icon={Target} label="Видение" active={activeScreen === 'vision'} onClick={() => setActiveScreen('vision')} />
          <NavButton icon={ListChecks} label="Тактики" active={activeScreen === 'tactics'} onClick={() => setActiveScreen('tactics')} />
          <NavButton icon={ClipboardCheck} label="Неделя" active={activeScreen === 'week'} onClick={() => setActiveScreen('week')} />
          <NavButton icon={BarChart3} label="Дашборд" active={activeScreen === 'dashboard'} onClick={() => setActiveScreen('dashboard')} />
        </nav>
      </div>
    </div>
  );
}
