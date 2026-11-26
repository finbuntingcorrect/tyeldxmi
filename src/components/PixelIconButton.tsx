import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { buttonSources, warmImages, type PixelButtonKind } from '../lib/uiKit';

type PixelIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  kind: PixelButtonKind;
  label: string;
  children?: ReactNode;
};

export function PixelIconButton({ kind, label, className, children, type = 'button', ...rest }: PixelIconButtonProps) {
  useEffect(() => {
    warmImages(buttonSources());
  }, []);

  return (
    <button
      type={type}
      className={className ? `pixel-button ${className}` : 'pixel-button'}
      data-kind={kind}
      aria-label={children ? undefined : label}
      {...rest}
    >
      <span className="pixel-button-art" aria-hidden="true" />
      {children}
    </button>
  );
}
