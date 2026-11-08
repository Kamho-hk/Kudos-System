// Renders the user's avatar image when available, otherwise initials on a
// name-derived color (no external image dependency for the demo).
export default function Avatar({ user }) {
  if (!user) return null;
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hash = [...user.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = `hsl(${hash % 360} 55% 45%)`;

  return (
    <span className="avatar" style={{ background: bg }} title={user.name}>
      {user.avatar_url ? <img src={user.avatar_url} alt="" /> : initials}
    </span>
  );
}
