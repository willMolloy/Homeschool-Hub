/**
 * Settings-style list of named, colored, archivable things (children, subjects).
 * KidsPage and SubjectsPage are thin wrappers around this.
 */
import { useId, useState } from "react";
import { useApi } from "../../api/useApi";
import { ColorDot } from "../../ui/ColorDot";
import "../../ui/forms.css";
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
}

export function RosterPage({ title, endpoint, emptyText }: RosterConfig) {
  const [showArchived, setShowArchived] = useState(false);
  const path = showArchived ? `${endpoint}?includeArchived=true` : endpoint;
  const { data, error, loading, reload } = useApi<RosterItem[]>(path);
  const toggleId = useId();

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
          <div className="roster-empty-actions" data-slot="add" />
        </div>
      )}
    </section>
  );
}
