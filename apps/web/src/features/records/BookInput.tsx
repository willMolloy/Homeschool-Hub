/**
 * S16-06: the books field of a log entry as an accessible combobox (arrow keys, Enter, Esc). As the parent types, matching titles from
 * the family's own logs and assignments are offered; a tap adds one. Enter adds exactly what was typed unless an option has been
 * chosen with the arrow keys. The field starts empty and nothing is ever added for the parent. With the field empty, the child's
 * last five titles sit under it as one-tap chips.
 */
import { useId, useState } from "react";
import { Button } from "../../ui/components";

export interface BookInputProps {
  value: string;
  onChange: (v: string) => void;
  /** Adds a title to the entry (the parent's choice) and clears the field. */
  onAdd: (title: string) => void;
  suggestions: readonly string[];
  recent: readonly string[];
}

export function BookInput({ value, onChange, onAdd, suggestions, recent }: BookInputProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [active, setActive] = useState(-1);
  const [closed, setClosed] = useState(false);
  const open = suggestions.length > 0 && !closed;
  const take = (title: string) => { onAdd(title); setActive(-1); setClosed(false); };
  return (
    <>
      <div className="log-book-add">
        <div className="book-combo">
          <input type="text" role="combobox" aria-label="Book title" aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
            aria-activedescendant={open && active >= 0 ? `${id}-o${active}` : undefined}
            placeholder="Title" maxLength={200} autoComplete="off" value={value}
            onChange={(e) => { onChange(e.target.value); setActive(-1); setClosed(false); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && suggestions.length > 0) { e.preventDefault(); setClosed(false); setActive((a) => (a + 1) % suggestions.length); }
              else if (e.key === "ArrowUp" && suggestions.length > 0) { e.preventDefault(); setClosed(false); setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1)); }
              else if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setClosed(true); setActive(-1); }
              else if (e.key === "Enter") { e.preventDefault(); if (open && active >= 0) take(suggestions[active]!); else if (value.trim()) take(value); }
            }} />
          <ul id={listId} role="listbox" aria-label="Matching titles" className="book-options" hidden={!open}>
            {suggestions.map((s, i) => (
              // mouse down, not click, so the field keeps its focus and the list does not vanish before the tap lands
              <li key={s} id={`${id}-o${i}`} role="option" aria-selected={i === active} className="book-option" onMouseDown={(e) => e.preventDefault()} onClick={() => take(s)}>{s}</li>
            ))}
          </ul>
        </div>
        <Button variant="secondary" onClick={() => { if (value.trim()) take(value); }}>Add</Button>
      </div>
      {value.trim() === "" && recent.length > 0 ? (
        <div className="book-recent" role="group" aria-label="Recent titles">
          <span className="book-recent-label">Recent</span>
          {recent.map((t) => <button key={t} type="button" className="chip" onClick={() => take(t)}>{t}</button>)}
        </div>
      ) : null}
    </>
  );
}
