/**
 * Settings-style list of named, colored, archivable things (children, subjects).
 * KidsPage and SubjectsPage are thin wrappers around this.
 */
import { useId, useRef, useState } from "react";
import { apiPost } from "../../api/client";
import { useApi } from "../../api/useApi";
import { ColorDot } from "../../ui/ColorDot";
import "../../ui/forms.css";
import { nextUnusedColor } from "./palette";
import { RosterForm, type RosterValues } from "./RosterForm";
import "./roster.css";

export interface RosterItem {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  archived: boolean;
}

export interface RosterConfig {
  title: string;
  /** e.g. "/api/children" */
  endpoint: string;
  /** e.g. "No children yet." */
  emptyText: string;
  /** Singular noun for buttons and form labels, e.g. "child". */
  noun: string;
}

export function RosterPage({ title, endpoint, emptyText, noun }: RosterConfig) {
  const [showArchived, setShowArchived] = useState(false);
  const path = showArchived ? `${endpoint}?includeArchived=true` : endpoint;
  const { data, error, loading, reload, setData } = useApi<RosterItem[]>(path);
  const toggleId = useId();
  const [adding, setAdding] = useState(false);
  const addBtn = useRef<HTMLButtonElement>(null);

  function closeAdd() {
    setAdding(false);
    // Return focus to the Add button once it's rendered again.
    requestAnimationFrame(() => addBtn.current?.focus());
  }

  async function create(values: RosterValues) {
    const created = await apiPost<RosterItem>(endpoint, values);
    setData((prev) => [...(prev ?? []), created]);
    closeAdd();
  }

  const items = data ?? [];
  const addArea = adding ? (
    <RosterForm
      label={`Add ${noun}`}
      submitLabel="Add"
      initial={{ name: "", color: nextUnusedColor(items.filter((i) => !i.archived).map((i) => i.color)) }}
      onSave={create}
      onCancel={closeAdd}
    />
  ) : (
    <div className="roster-actions">
      <button ref={addBtn} className="btn" type="button" onClick={() => setAdding(true)}>Add {noun}</button>
    </div>
  );

  return (
    <section className="roster">
      <div className="roster-head">
        <h1>{title}</h1>
        <label className="roster-toggle" htmlFor={toggleId}>
          <input id={toggleId} type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {loading ? (
        <ul className="roster-list" aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
          {[0, 1, 2].map((i) => (
            <li key={i} className="roster-row skeleton" aria-hidden="true">
              <span className="color-dot" />
              <span className="skeleton-bar" />
            </li>
          ))}
        </ul>
      ) : error ? (
        <div className="form-error roster-error" role="alert">
          <p>{error.status === 0 ? "Can't reach the server." : `Couldn't load ${title.toLowerCase()}.`}</p>
          <button className="btn btn-secondary" type="button" onClick={reload}>Retry</button>
        </div>
      ) : data && data.length > 0 ? (
        <ul className="roster-list" aria-label={title}>
          {data.map((item) => (
            <li key={item.id} className={`roster-row${item.archived ? " is-archived" : ""}`}>
              <ColorDot color={item.color} />
              <span className="roster-name">{item.name}</span>
              {item.archived ? <span className="tag">Archived</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="roster-empty">
          <p>{emptyText}</p>
        </div>
      )}
      {!loading && !error ? addArea : null}
    </section>
  );
}
