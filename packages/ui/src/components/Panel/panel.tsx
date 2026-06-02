import { cva } from 'class-variance-authority';
import { cn } from '@/lib';
import type {
  PanelRootProps,
  PanelHeaderProps,
  PanelBodyProps,
  PanelFooterProps,
} from './panel.types';

const root = cva('relative flex flex-col rounded-lg text-foreground', {
  variants: {
    tone: {
      surface: 'bg-(--panel-bg)',
      raised: 'bg-surface-raised',
      sunken: 'bg-surface-sunken',
    },
    bordered: { true: 'border border-(--panel-border)', false: '' },
    elevated: { true: 'shadow-[var(--panel-shadow)]', false: '' },
    fill: { true: 'min-h-0 h-full', false: '' },
  },
  defaultVariants: {
    tone: 'surface',
    bordered: true,
    elevated: false,
    fill: false,
  },
});

const padding = cva('', {
  variants: {
    padding: {
      none: 'p-0',
      sm: 'px-3 py-2',
      md: 'px-4 py-3',
      lg: 'px-6 py-5',
    },
  },
  defaultVariants: { padding: 'md' },
});

function PanelRoot({
  tone = 'surface',
  bordered = true,
  elevated = false,
  fill = false,
  className,
  children,
  ...rest
}: PanelRootProps): React.JSX.Element {
  return (
    <div className={cn(root({ tone, bordered, elevated, fill }), className)} {...rest}>
      {children}
    </div>
  );
}

function PanelHeader({
  padding: pad = 'md',
  actions,
  className,
  children,
  ...rest
}: PanelHeaderProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 border-b border-(--panel-border) bg-(--panel-header-bg) text-(--panel-header-fg) rounded-t-lg font-medium',
        padding({ padding: pad }),
        className
      )}
      {...rest}
    >
      <div className="min-w-0 flex-1 truncate">{children}</div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

function PanelBody({
  padding: pad = 'md',
  scroll = false,
  className,
  children,
  ...rest
}: PanelBodyProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex-1',
        scroll && 'min-h-0 overflow-auto',
        padding({ padding: pad }),
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

function PanelFooter({
  padding: pad = 'md',
  className,
  children,
  ...rest
}: PanelFooterProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2 border-t border-(--panel-border) rounded-b-lg',
        padding({ padding: pad }),
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * 범용 컨테이너. Compound 패턴으로 Header/Body/Footer 를 조합한다.
 * 데이터 무지 — children 으로 받은 내용을 레이아웃만 한다.
 *
 * <Panel.Root>
 *   <Panel.Header actions={<…/>}>제목</Panel.Header>
 *   <Panel.Body scroll>내용</Panel.Body>
 *   <Panel.Footer>액션</Panel.Footer>
 * </Panel.Root>
 */
export const Panel = {
  Root: PanelRoot,
  Header: PanelHeader,
  Body: PanelBody,
  Footer: PanelFooter,
};
