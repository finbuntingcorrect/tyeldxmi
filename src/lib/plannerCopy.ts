import type { CatLook, CatRole, DayPart, Occupation, Priority, Purpose, RepeatKind } from '../types';

export const DAY_PARTS: { id: DayPart; label: string }[] = [
  { id: 'morning', label: 'Утро' },
  { id: 'afternoon', label: 'День' },
  { id: 'evening', label: 'Вечер' },
  { id: 'anytime', label: 'Без времени' },
];

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 'high', label: 'Высокий' },
  { id: 'normal', label: 'Обычный' },
  { id: 'low', label: 'Низкий' },
];

export const LOOKS: { id: CatLook; label: string; filter: string }[] = [
  { id: 'classic', label: 'Рыжий', filter: 'none' },
  { id: 'warm', label: 'Солнечный', filter: 'sepia(0.28) saturate(1.25)' },
  { id: 'sage', label: 'Травяной', filter: 'hue-rotate(45deg) saturate(0.85)' },
  { id: 'night', label: 'Ночной', filter: 'hue-rotate(200deg) saturate(0.65) brightness(0.92)' },
];

export const ROLES: { id: CatRole; label: string; text: string }[] = [
  { id: 'planner', label: 'Планировщик', text: 'Раскладывает дела на утро, день и вечер и вечером помогает решить, что перенести.' },
  { id: 'focus', label: 'Помощник по фокусу', text: 'Держит одну главную задачу перед глазами и радуется, когда она закрыта.' },
  { id: 'habits', label: 'Напарник по привычкам', text: 'Показывает повторы на сегодня и помогает выбрать расписание.' },
];

export const OCCUPATIONS: { id: Occupation; label: string }[] = [
  { id: 'team', label: 'Работаю в команде' },
  { id: 'solo', label: 'Работаю на себя' },
  { id: 'study', label: 'Учусь' },
  { id: 'other', label: 'Другое' },
];

export const PURPOSES: { id: Purpose; label: string }[] = [
  { id: 'work', label: 'Рабочие задачи' },
  { id: 'study', label: 'Учёба' },
  { id: 'personal', label: 'Личные дела' },
  { id: 'habits', label: 'Привычки' },
  { id: 'mix', label: 'Понемногу всего' },
];

export const WEEKDAYS = [
  { id: 1, label: 'Пн' },
  { id: 2, label: 'Вт' },
  { id: 3, label: 'Ср' },
  { id: 4, label: 'Чт' },
  { id: 5, label: 'Пт' },
  { id: 6, label: 'Сб' },
  { id: 0, label: 'Вс' },
];

export function purposeExamples(purpose: Purpose | null) {
  if (purpose === 'study') return ['Подготовить конспект', 'Повторить одну тему'];
  if (purpose === 'work') return ['Ответить команде', 'Собрать короткий отчёт'];
  if (purpose === 'personal') return ['Полить цветы', 'Разобрать одну полку'];
  if (purpose === 'habits') return ['Стакан воды', 'Десять минут прогулки'];
  return ['Главное дело дня', 'Одно маленькое личное дело'];
}

export function suggestedRole(purpose: Purpose | null): CatRole {
  if (purpose === 'study' || purpose === 'work') return 'focus';
  if (purpose === 'habits') return 'habits';
  return 'planner';
}

export function priorityRank(priority: Priority) {
  if (priority === 'high') return 0;
  if (priority === 'low') return 2;
  return 1;
}

export function repeatLabel(kind: RepeatKind | null, weekdays: number[]) {
  if (kind === 'daily') return 'Каждый день';
  if (kind === 'weekdays') return 'По будням';
  if (kind === 'weekly') {
    const names = WEEKDAYS.filter((day) => weekdays.includes(day.id)).map((day) => day.label);
    return names.length ? names.join(', ') : 'По дням недели';
  }
  return '';
}
