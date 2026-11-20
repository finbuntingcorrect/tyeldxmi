export function FirstHello({ onAdd, onSkip }: { onAdd: () => void; onSkip: () => void }) {
  return (
    <main className="first-hello">
      <h1>Привет!</h1>
      <p>Начни с одного небольшого дела.</p>
      <button type="button" className="paper-submit" onClick={onAdd}>Добавить первую задачу</button>
      <button type="button" className="paper-choice" onClick={onSkip}>Пропустить</button>
    </main>
  );
}
