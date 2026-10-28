/**
 * Settings-style list of named, colored, archivable things (children, subjects).
 * KidsPage and SubjectsPage are thin wrappers around this.
 */
import { useId, useRef, useState } from "react";
import { ApiError, apiPatch, apiPost } from "../../api/client";
import { useApi } from "../../api/useApi";
import { ColorDot } from "../../ui/ColorDot";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
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

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Can't reach the server.";
    if (err.status === 400 || err.status === 409) return err.message.replace(/^[a-zA-Z.]+: /, "");
    if (err.status === 404) return "That item no longer exists. Reload the page.";
  }
  return "Couldn't save. Please try again.";
}

export function RosterPage({ title, endpoint, emptyText, noun }: RosterConfig) {
  const [showArchived, setShowArchived] = useState(false);
  const path = showArchived ? `${endpoint}?includeArchived=true` : endpoint;
  const { data, error, loading, reload, setData } = useApi<RosterItem[]>(path);
  const toggleId = useId();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<RosterItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const addBtn = useRef<HTMLButtonElement>(null);

  const items = data ?? [];

  function focusLater(selector: () => HTMLElement | null | undefined) {
    requestAnimationFrame(() => selector()?.focus());
  }

  function closeAdd() {
    setAdding(false);
    focusLater(() => addBtn.current);
  }

  function openEdit(id: string) {
    setAdding(false);
    setActionError(null);
    setEditingId(id);
  }

  function closeEdit(id: string | null = editingId) {
    setEditingId(null);
    setActionError(null);
    if (id) focusLater(() => document.querySelector<HTMLElement>(`[data-row-id="${id}"]`));
  }

  /** Replace a row, or drop it when it's now archived and archived rows are hidden. */
  function applyUpdate(updated: RosterItem) {
    setData((prev) =>
      (prev ?? []).flatMap((i) => (i.id !== updated.id ? [i] : updated.archived && !showArchived ? [] : [updated])),
    );
  }

  async function create(values: RosterValues) {
    const created = await apiPost<RosterItem>(endpoint, values);
    setData((prev) => [...(prev ?? []), created]);
    closeAdd();
  }

  async function save(item: RosterItem, values: RosterValues) {
    const patch: Partial<RosterValues> = {};
    if (values.name !== item.name) patch.name = values.name;
    if (values.color !== item.color) patch.color = values.color;
    if (Object.keys(patch).length === 0) return closeEdit(item.id);
    applyUpdate(await apiPatch<RosterItem>(`${endpoint}/${item.id}`, patch));
    closeEdit(item.id);
  }

  async function setArchived(item: RosterItem, archived: boolean) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await apiPatch<RosterItem>(`${endpoint}/${item.id}`, { archived });
      setArchiving(null);
      applyUpdate(updated);
      if (archived && !showArchived) {
        setEditingId(null);
        focusLater(() => addBtn.current);
      } else closeEdit(item.id);
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

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
      <button
        ref={addBtn}
        className="btn"
        type="button"
        onClick={() => {
          setEditingId(null);
          setAdding(true);
        }}
      >
        Add {noun}
      </button>
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
      ) : items.length > 0 ? (
        <ul className="roster-list" aria-label={title}>
          {items.map((item) =>
            item.id === editingId ? (
              <li key={item.id} className="roster-row is-editing">
                <RosterForm
                  label={`Edit ${item.name}`}
                  submitLabel="Save"
                  initial={{ name: item.name, color: item.color }}
                  onSave={(v) => save(item, v)}
                  onCancel={() => closeEdit(item.id)}
                  externalError={archiving ? null : actionError}
                  extra={
                    item.archived ? (
                      <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setArchived(item, false)}>
                        Unarchive
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-danger"
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setArchiving(item);
                        }}
                      >
                        Archive
                      </button>
                    )
                  }
                />
              </li>
            ) : (
              <li key={item.id} className={`roster-row${item.archived ? " is-archived" : ""}`}>
                <button type="button" className="roster-row-btn" data-row-id={item.id} onClick={() => openEdit(item.id)}>
                  <ColorDot color={item.color} />
                  <span className="roster-name">{item.name}</span>
                  {item.archived ? <span className="tag">Archived</span> : null}
                </button>
              </li>
            ),
          )}
        </ul>
      ) : (
        <div className="roster-empty">
          <p>{emptyText}</p>
        </div>
      )}
      {!loading && !error ? addArea : null}

      {archiving ? (
        <ConfirmDialog
          title={`Archive ${archiving.name}?`}
          confirmLabel="Archive"
          busy={busy}
          error={actionError}
          onConfirm={() => setArchived(archiving, true)}
          onCancel={() => {
            setArchiving(null);
            setActionError(null);
          }}
        >
          <p>Past work and history stay; it is hidden from planning and lists.</p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
