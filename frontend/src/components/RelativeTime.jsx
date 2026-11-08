// "2 hours ago" style timestamp; full ISO datetime on hover (spec AC-2.2).
export default function RelativeTime({ iso }) {
  const then = Date.parse(iso);
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  let text;
  if (seconds < 60) text = 'just now';
  else if (seconds < 3600) text = `${Math.floor(seconds / 60)} min ago`;
  else if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    text = `${h} hour${h === 1 ? '' : 's'} ago`;
  } else {
    const d = Math.floor(seconds / 86400);
    text = `${d} day${d === 1 ? '' : 's'} ago`;
  }
  return <time dateTime={iso} title={new Date(then).toLocaleString()}>{text}</time>;
}
