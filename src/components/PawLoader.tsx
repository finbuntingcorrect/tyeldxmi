import { uiKit } from '../lib/uiKit';

export function PawLoader() {
  return (
    <span className="cat-loader" role="status" aria-label="Загрузка">
      {uiKit.paw.map((src) => <img key={src} src={src} alt="" width={22} height={22} draggable={false} />)}
    </span>
  );
}
