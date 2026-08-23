import { PageHeader } from '../components/ui';

export function PlaceholderPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="card-panel text-sm text-ink-600">
        Placeholder screen — wire to API later. Navigation and shell already
        match the industrial layout.
      </div>
    </div>
  );
}
