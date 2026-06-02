import { cn } from '@/lib';
import type {
  DetailPanelRootProps,
  DetailPanelHeaderProps,
  DetailPanelSectionProps,
  DetailPanelFieldProps,
} from './detail-panel.types';

function DetailRoot({
  scroll = true,
  className,
  children,
  ...rest
}: DetailPanelRootProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col bg-(--detail-panel-bg) text-foreground',
        scroll && 'min-h-0 h-full overflow-auto',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

function DetailHeader({
  title,
  subtitle,
  leading,
  actions,
  badges,
  className,
}: DetailPanelHeaderProps): React.JSX.Element {
  return (
    <div className={cn('sticky top-0 z-10 border-b border-(--detail-divider) bg-(--detail-panel-bg) px-4 py-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {leading ? <span className="mt-0.5 shrink-0 text-muted-foreground">{leading}</span> : null}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            {subtitle ? (
              <p className="truncate font-mono text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </div>
      {badges ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div> : null}
    </div>
  );
}

function DetailSection({
  label,
  children,
  className,
}: DetailPanelSectionProps): React.JSX.Element {
  return (
    <section className={cn('border-b border-(--detail-divider) px-4 py-3 last:border-b-0', className)}>
      {label ? (
        <h3 className="mb-2 text-xs font-medium tracking-wide text-(--detail-section-label-fg) uppercase">
          {label}
        </h3>
      ) : null}
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function DetailField({
  label,
  children,
  layout = 'row',
  className,
}: DetailPanelFieldProps): React.JSX.Element {
  if (layout === 'stack') {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="text-xs text-(--detail-section-label-fg)">{label}</div>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn('flex items-baseline gap-3 text-sm', className)}>
      <div className="w-28 shrink-0 text-xs text-(--detail-section-label-fg)">{label}</div>
      <div className="min-w-0 flex-1 text-foreground">{children}</div>
    </div>
  );
}

/**
 * 범용 상세 패널. Compound 패턴으로 헤더/섹션/필드를 조합한다.
 * 도메인 무지 — frontmatter 4축(정체성/의미/관계/메타) 구성은 호출부가 슬롯에 채운다.
 *
 * <DetailPanel.Root>
 *   <DetailPanel.Header title=… subtitle=… badges={…} />
 *   <DetailPanel.Section label="정의">…</DetailPanel.Section>
 *   <DetailPanel.Section label="메타">
 *     <DetailPanel.Field label="owner">…</DetailPanel.Field>
 *   </DetailPanel.Section>
 * </DetailPanel.Root>
 */
export const DetailPanel = {
  Root: DetailRoot,
  Header: DetailHeader,
  Section: DetailSection,
  Field: DetailField,
};
