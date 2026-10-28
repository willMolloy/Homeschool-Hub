/**
 * List + add/edit pattern shared by the assignments, days-off and events screens (S2a-14..16).
 * Cards open an inline edit form; "archive" lists hide archived rows unless "Show archived" is on,
 * "delete" lists remove rows outright. Both confirm first.
 */
import { useId, useRef, useState, type ReactNode } from "react";
import { apiDelete, apiPatch } from "../../api/client";
import { useApi } from "../../api/useApi";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import "../../ui/forms.css";
import { saveError } from "./formBits";
import { BackToSchedule } from "./ScheduleHub";
import "./schedule.css";

export interface ListItem {
  id: string;
  archived?: boolean;
}

export interface FormSlotProps<T> {
  /** null = adding. */
  item: T | null;
  onSaved: (saved: T) => void;
  onCancel: () => void;
  /** Archive/Unarchive/Delete button for the form's button row (edit only). */
  extra: ReactNode;
  /** An archive/delete failure to show in the form. */
  externalError: string | null;
}

interface Props<T extends ListItem> {
  title: string;
  /** Singular, lower case: "assignment". */
  noun: string;
  endpoint: string;
  emptyText: string;
  removal: "archive" | "delete";
  /** Shown in confirm dialogs. */
  labelOf: (item: T) => string;
  sort?: (a: T, b: T) => number;
  renderCard: (item: T) => ReactNode;
  renderForm: (p: FormSlotProps<T>) => ReactNode;
  /** Under the archive/delete confirm title. */
  confirmText: string;
  /** Extra content above the list (e.g. a hint). */
  intro?: ReactNode;
}

export function ScheduleList<T extends ListItem>(props: Props<T>) {
  const { title, noun, endpoint, emptyText, removal, labelOf, sort, renderCard, renderForm, confirmText, intro } = props;
  const archivable = removal === "archive";
  const [showArchived, setShowArchived] = useState(false);
  const path = archivable && showArchived ? `${endpoint}?includeArchived=true` : endpoint;
  const { data, error, loading, reload, setData } = useApi<T[]>(path);
  const toggleId = useId();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const addBtn = useRef<HTMLButtonElement>(null);

  const items = sort ? [...(data ?? [])].sort(sort) : data ?? [];

  const focusLater = (el: () => HTMLElement | null | undefined) => requestAnimationFrame(() => el()?.focus());
  const focusRow = (id: string) => focusLater(() => document.querySelector<HTMLElement>(`[data-row-id="${id}"]`));

  function closeAdd() {
    setAdding(false);
    focusLater(() => addBtn.current);
  }
  function closeEdit(id: string | null) {
    setEditingId(null);
    setActionError(null);
    if (id) focusRow(id);
  }
  /** Replace a row, or drop it when it's now archived and archived rows are hidden. */
  function applyUpdate(updated: T) {
    setData((prev) => (prev ?? []).flatMap((i) => (i.id !== updated.id ? [i] : updated.archived && !showArchived ? [] : [updated])));
  }

  async function remove(item: T) {
    setBusy(true);
    setActionError(null);
    try {
      if (archivable) {
        applyUpdate(await apiPatch<T>(`${endpoint}/${item.id}`, { archived: true }));
      } else {
        await apiDelete(`${endpoint}/${item.id}`);
        setData((prev) => (prev ?? []).filter((i) => i.id !== item.id));
      }
      setConfirming(null);
      if (archivable && showArchived) closeEdit(item.id);
      else {
        setEditingId(null);
        focusLater(() => addBtn.current);
      }
    } catch (err) {
      setActionError(saveError(err));
    } finally {
      setBusy(false);
    }
  }

  async function unarchive(item: T) {
    setBusy(true);
    setActionError(null);
    try {
      applyUpdate(await apiPatch<T>(`${endpoint}/${item.id}`, { archived: false }));
      closeEdit(item.id);
    } catch (err) {
      setActionError(saveError(err));
    } finally {
      setBusy(false);
    }
  }

  function extraFor(item: T): ReactNode {
    if (archivable && item.archived) {
      return (
        <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => unarchive(item)}>
          Unarchive
        </button>
      );
    }
    return (
      <button
        className="btn btn-secondary btn-danger"
        type="button"
        onClick={() => {
          setActionError(null);
          setConfirming(item);
        }}
      >
        {archivable ? "Archive" : "Delete"}
      </button>
    );
  }

  return (
    <section className="schedule">
      <BackToSchedule />
      <div className="schedule-head">
        <h1>{title}</h1>
        {archivable ? (
          <label className="schedule-toggle" htmlFor={toggleId}>
            <input id={toggleId} type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        ) : null}
      </div>
      {intro}

      {loading ? (
        <p aria-busy="true">Loading…</p>
      ) : error ? (
        <div className="form-error" role="alert">
          <p>{error.status === 0 ? "Can't reach the server." : `Couldn't load ${title.toLowerCase()}.`}</p>
          <button className="btn btn-secondary" type="button" onClick={reload}>Retry</button>
        </div>
      ) : (
        <>
          {adding ? (
            renderForm({
              item: null,
              onSaved: (created) => {
                setData((prev) => [...(prev ?? []), created]);
                setAdding(false);
                focusRow(created.id);
              },
              onCancel: closeAdd,
              extra: null,
              externalError: null,
            })
          ) : (
            <div className="schedule-actions">
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
          )}
          {items.length > 0 ? (
            <ul className="schedule-list" aria-label={title}>
              {items.map((item) => (
                <li key={item.id} className={`schedule-card${item.archived ? " is-archived" : ""}`}>
                  {item.id === editingId ? (
                    renderForm({
                      item,
                      onSaved: (saved) => {
                        applyUpdate(saved);
                        closeEdit(saved.id);
                      },
                      onCancel: () => closeEdit(item.id),
                      extra: extraFor(item),
                      externalError: confirming ? null : actionError,
                    })
                  ) : (
                    <button
                      type="button"
                      className="schedule-card-btn"
                      data-row-id={item.id}
                      onClick={() => {
                        setAdding(false);
                        setActionError(null);
                        setEditingId(item.id);
                      }}
                    >
                      {renderCard(item)}
                      {item.archived ? <span className="tag">Archived</span> : null}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : !adding ? (
            <p className="schedule-empty">{emptyText}</p>
          ) : null}
        </>
      )}

      {confirming ? (
        <ConfirmDialog
          title={`${archivable ? "Archive" : "Delete"} ${labelOf(confirming)}?`}
          confirmLabel={archivable ? "Archive" : "Delete"}
          busy={busy}
          error={actionError}
          onConfirm={() => remove(confirming)}
          onCancel={() => {
            setConfirming(null);
            setActionError(null);
          }}
        >
          <p>{confirmText}</p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
