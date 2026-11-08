import { useState } from 'react';
import { api } from '../api';
import UserSelect from './UserSelect';
import MessageInput from './MessageInput';

// KudosForm (spec §2.3): client validation, submit flow, success reset,
// error preservation (AC-1.1–1.9).
export default function KudosForm({ onSubmitted }) {
  const [recipient, setRecipient] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Client-side validation mirrors server rules for fast feedback.
    if (!recipient) return setError('Please select a colleague');
    if (!message.trim()) return setError('Message is required');
    if (message.trim().length > 280) return setError('Message must be 280 characters or fewer');

    setSubmitting(true);
    try {
      const { kudos } = await api.createKudos(recipient.id, message);
      setRecipient(null);
      setMessage('');
      setSuccess(true);
      onSubmitted?.(kudos);
    } catch (err) {
      // On any error (400/404/409/429/network) inputs are preserved (AC-1.7/1.9).
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card kudos-form" onSubmit={handleSubmit}>
      <h2>Give kudos</h2>
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">Kudos sent! It&apos;s now live in the feed.</div>}
      <div className="field">
        <label htmlFor="recipient">To</label>
        <UserSelect selected={recipient} onSelect={setRecipient} />
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <MessageInput value={message} onChange={setMessage} />
      </div>
      <button className="submit-btn" type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send kudos'}
      </button>
    </form>
  );
}
