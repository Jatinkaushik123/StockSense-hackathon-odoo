const TONE_BY_STATUS = {
  Draft: 'draft',
  Waiting: 'waiting',
  Ready: 'ready',
  Done: 'done',
  Canceled: 'canceled',
};

export default function StatusBadge({ status }) {
  const tone = TONE_BY_STATUS[status] || 'draft';
  return <span className={`badge badge-${tone}`}>{status}</span>;
}
