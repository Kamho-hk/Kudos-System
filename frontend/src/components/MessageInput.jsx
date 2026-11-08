// Message textarea with live character counter (spec: MessageInput).
// Hard-stops at maxLength; counter turns red at >= 260 chars (AC-1.6).
export default function MessageInput({ value, onChange, maxLength = 280 }) {
  return (
    <div className="message-input">
      <textarea
        value={value}
        maxLength={maxLength}
        placeholder="What did they do that deserves recognition?"
        onChange={(e) => onChange(e.target.value)}
      />
      <div className={value.length >= 260 ? 'char-counter warn' : 'char-counter'}>
        {value.length}/{maxLength}
      </div>
    </div>
  );
}
