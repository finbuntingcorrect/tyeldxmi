import { useEffect, type ButtonHTMLAttributes } from 'react';
import { uiKit, warmImages } from '../lib/uiKit';

type PixelArrowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  direction: 'previous' | 'next';
  label: string;
};

export function PixelArrow({ direction, label, className, type = 'button', ...rest }: PixelArrowProps) {
  useEffect(() => {
    warmImages([uiKit.arrow.previous, uiKit.arrow.next]);
  }, []);

  return (
    <button
      type={type}
      className={className ? `pixel-arrow ${className}` : 'pixel-arrow'}
      aria-label={label}
      {...rest}
    >
      <img src={direction === 'next' ? uiKit.arrow.next : uiKit.arrow.previous} alt="" width={52} height={52} draggable={false} />
    </button>
  );
}
