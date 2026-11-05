import { Check, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { Task } from '../types';

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => boolean;
  onDelete: (id: string) => void;
};

export function TaskItem({ task, onToggle, onRename, onDelete }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const skipBlurSave = useRef(false);
  const errorId = useId();

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  function save() {
    const renamed = onRename(task.id, draft);
    if (!renamed) {
      setEditError('Название не может быть пустым');
      inputRef.current?.focus();
      return;
    }
    setEditError(null);
    setEditing(false);
  }

  function cancelEdit() {
    skipBlurSave.current = true;
    setDraft(task.title);
    setEditError(null);
    setEditing(false);
  }

  return (
    <li
      className={`rounded-2xl border border-line px-2 py-2 shadow-[0_1px_0_rgba(46,33,27,0.04)] transition hover:border-[#ddcbb8] ${
        task.completed ? 'bg-[#F8F4EC]' : 'bg-card'
      }`}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={
            task.completed
              ? `Вернуть в работу: ${task.title}`
              : `Отметить выполненной: ${task.title}`
          }
          onClick={() => onToggle(task.id)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        >
          <span
            className={`grid h-6 w-6 place-items-center rounded-md border-2 ${
              task.completed
                ? 'border-success bg-success text-ink'
                : 'border-[#d8c4b0] bg-white'
            }`}
          >
            {task.completed ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : null}
          </span>
        </button>

        <div className="min-w-0 flex-1 pt-2.5">
          {editing ? (
            <>
              <label htmlFor={`edit-${task.id}`} className="sr-only">
                Название задачи
              </label>
              <input
                id={`edit-${task.id}`}
                ref={inputRef}
                value={draft}
                maxLength={160}
                aria-invalid={editError ? true : undefined}
                aria-describedby={editError ? errorId : undefined}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (editError) setEditError(null);
                }}
                onBlur={() => {
                  if (skipBlurSave.current) {
                    skipBlurSave.current = false;
                    return;
                  }
                  save();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    save();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelEdit();
                  }
                }}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base font-semibold text-ink outline-none focus-visible:border-primary"
              />
              {editError ? (
                <p id={errorId} className="mt-1 text-sm font-semibold text-[#8C3F32]" role="alert">
                  {editError}
                </p>
              ) : (
                <p className="mt-1 text-xs font-semibold text-muted">Enter — сохранить, Esc — отмена</p>
              )}
            </>
          ) : (
            <p
              className={`break-words pr-2 text-base font-bold leading-snug ${
                task.completed ? 'text-muted line-through decoration-2 decoration-[#6d5c50]' : 'text-ink'
              }`}
            >
              {task.title}
            </p>
          )}
        </div>

        {editing ? (
          <button
            type="button"
            onMouseDown={() => {
              skipBlurSave.current = true;
            }}
            onClick={cancelEdit}
            className="inline-flex h-11 shrink-0 items-center rounded-xl px-3 text-sm font-extrabold text-muted hover:bg-cream hover:text-ink"
          >
            Отмена
          </button>
        ) : (
          <div className="flex shrink-0">
            <button
              type="button"
              aria-label={`Редактировать «${task.title}»`}
              onClick={() => {
                setConfirming(false);
                setDraft(task.title);
                setEditError(null);
                setEditing(true);
              }}
              className="grid h-11 w-11 place-items-center rounded-xl text-muted transition hover:bg-cream hover:text-ink"
            >
              <Pencil aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              aria-label={`Удалить «${task.title}»`}
              aria-expanded={confirming}
              onClick={() => setConfirming(true)}
              className="grid h-11 w-11 place-items-center rounded-xl text-muted transition hover:bg-cream hover:text-ink"
            >
              <Trash2 aria-hidden="true" size={18} />
            </button>
          </div>
        )}
      </div>

      {confirming && !editing ? (
        <div className="mx-2 mb-1 mt-1 flex flex-wrap items-center gap-2 rounded-xl bg-cream px-3 py-2" role="group" aria-label="Подтверждение удаления">
          <p className="mr-auto text-sm font-bold text-ink">Удалить эту задачу?</p>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="inline-flex min-h-11 items-center rounded-xl bg-[#A24B3A] px-3 text-sm font-extrabold text-white"
          >
            Удалить
          </button>
          <button
            ref={keepRef}
            type="button"
            onClick={() => setConfirming(false)}
            className="inline-flex min-h-11 items-center rounded-xl border border-line bg-card px-3 text-sm font-extrabold text-ink"
          >
            Оставить
          </button>
        </div>
      ) : null}
    </li>
  );
}
