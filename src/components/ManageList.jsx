import { useState } from 'react';

export function ManageList({ title, hint, items, onAdd, onRemove }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setError('');
    try {
      await onAdd(value.trim());
      setValue('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="manage-list">
      <h3>{title}</h3>
      {hint && <p className="hint">{hint}</p>}
      <ul>
        {items.map((item) => (
          <li key={item}>
            <span>{item}</span>
            <button type="button" className="btn-ghost" onClick={() => onRemove(item)}>
              Remove
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="empty">No options yet.</li>}
      </ul>
      <form onSubmit={handleAdd} className="manage-list-add">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add new option…" />
        <button type="submit" className="btn-secondary">
          Add
        </button>
      </form>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
