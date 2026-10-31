/**
 * Settings-style list of named, colored, archivable things (children, subjects).
 * KidsPage and SubjectsPage are thin wrappers around this.
 */
import { useId, useRef, useState, type ReactNode } from "react";
import { ApiError, apiPatch, apiPost } from "../../api/client";
import { useApi } from "../../api/useApi";
import { ColorDot } from "../../ui/ColorDot";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import "../../ui/forms.css";
import { nextUnusedColor } from "./palette";
import { RosterForm, type RosterFormProps, type RosterValues } from "./RosterForm";
import "./roster.css";

export interface RosterItem {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  archived: boolean;
}

/** What a custom form receives: RosterForm's props, typed to the page's values, plus the row being edited. */
export interface RosterFormSlotProps<T extends RosterItem, V extends RosterValues> extends Omit<RosterFormProps, "initial" | "onSave" | "children"> {
  initial: V;
  onSave: (values: V) => Promise<void>;
  /** null when adding. */
  item: T | null;
}

/** Optional per-page extensions, so pages that need more fields (subjects) don't push them onto the others (kids). */
export interface RosterExtension<T extends RosterItem, V extends RosterValues> {
  /** Initial values for the extra fields; the page adds name and color. */
  initialExtra: (item: T | null) => Omit<V, keyof RosterValues>;
  renderForm: (props: RosterFormSlotProps<T, V>) => ReactNode;
  /** Shown after the name on a row, e.g. a chip. */
  renderBadge?: (item: T) => ReactNode;
}

/** Values are equal for PATCH purposes; a missing key counts as null. */
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export interface RosterConfig<T extends RosterItem = RosterItem, V extends RosterValues = RosterValues> {
  title: string;
  /** e.g. "/api/children" */
  endpoint: string;
  /** e.g. "No children yet." */
  emptyText: string;
  /** Singular noun for buttons and form labels, e.g. "child". */
  noun: string;
  extension?: RosterExtension<T, V>;
  /** S6b-08: one-tap names offered to a family that arrives with none (subjects: the common ones). */
  suggestions?: { label: string; names: readonly string[] };
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Can't reach the server.";
    if (err.status === 400 || err.status === 409) return err.message.replace(/^[a-zA-Z.]+: /, "");
    if (err.status === 404) return "That item no longer exists. Reload the page.";
  }
  return "Couldn't save. Please try again.";
}

export function RosterPage<T extends RosterItem = RosterItem, V extends RosterValues = RosterValues>({
  title, endpoint, emptyText, noun, extension, suggestions,
}: RosterConfig<T, V>) {
  const [showArchived, setShowArchived] = useState(false);
  const path = showArchived ? `${endpoint}?includeArchived=true` : endpoint;
  const { data, error, loading, reload, setData } = useApi<T[]>(path);
  const toggleId = useId();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const addBtn = useRef<HTMLButtonElement>(null);

  const items = data ?? [];
  // S6b-08: a family that arrives with none keeps being offered the rest while it taps through them.
  const [startedEmpty, setStartedEmpty] = useState(false);
  if (!startedEmpty && suggestions && !loading && !error && data && data.length === 0) setStartedEmpty(true);
  const remaining = startedEmpty && suggestions ? suggestions.names.filter((n) => !items.some((i) => i.name.trim().toLowerCase() === n.toLowerCase())) : [];

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
  function applyUpdate(updated: T) {
    setData((prev) =>
      (prev ?? []).flatMap((i) => (i.id !== updated.id ? [i] : updated.archived && !showArchived ? [] : [updated])),
    );
  }

  async function create(values: V) {
    const created = await apiPost<T>(endpoint, values);
    setData((prev) => [...(prev ?? []), created]);
    closeAdd();
  }

  /** S6b-08: one tap adds the name with the next free colour. */
  async function addSuggested(name: string) {
    setBusy(true);
    setActionError(null);
    try {
      const created = await apiPost<T>(endpoint, { name, color: nextUnusedColor(items.filter((i) => !i.archived).map((i) => i.color)) });
      setData((prev) => [...(prev ?? []), created]);
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  /** Only the changed fields are sent. */
  async function save(item: T, values: V) {
    const row = item as unknown as Record<string, unknown>;
    const patch = Object.fromEntries(Object.entries(values).filter(([k, v]) => !sameValue(v, row[k])));
    if (Object.keys(patch).length === 0) return closeEdit(item.id);
    applyUpdate(await apiPatch<T>(`${endpoint}/${item.id}`, patch));
    closeEdit(item.id);
  }

  async function setArchived(item: T, archived: boolean) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await apiPatch<T>(`${endpoint}/${item.id}`, { archived });
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

  const initialFor = (item: T | null, base: RosterValues): V => ({ ...base, ...extension?.initialExtra(item) }) as V;
  const renderForm = (props: RosterFormSlotProps<T, V>) =>
    extension ? extension.renderForm(props) : <RosterForm {...(props as unknown as RosterFormProps)} />;

  const addArea = adding ? (
    renderForm({
      label: `Add ${noun}`,
      submitLabel: "Add",
      initial: initialFor(null, { name: "", color: nextUnusedColor(items.filter((i) => !i.archived).map((i) => i.color)) }),
      onSave: create,
      onCancel: closeAdd,
      item: null,
    })
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
                {renderForm({
                  label: `Edit ${item.name}`,
                  submitLabel: "Save",
                  initial: initialFor(item, { name: item.name, color: item.color }),
                  onSave: (v) => save(item, v),
                  onCancel: () => closeEdit(item.id),
                  externalError: archiving ? null : actionError,
                  item,
                  extra: item.archived ? (
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
                  ),
                })}
              </li>
            ) : (
              <li key={item.id} className={`roster-row${item.archived ? " is-archived" : ""}`}>
                <button type="button" className="roster-row-btn" data-row-id={item.id} onClick={() => openEdit(item.id)}>
                  <ColorDot color={item.color} />
                  <span className="roster-name">{item.name}</span>
                  {extension?.renderBadge?.(item)}
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
      {suggestions && remaining.length > 0 && !loading && !error ? (
        <div className="roster-suggest" role="group" aria-label={suggestions.label}>
          <h2>{suggestions.label}</h2>
          <div className="roster-suggest-chips">
            {remaining.map((n) => (
              <button key={n} type="button" className="btn btn-secondary" disabled={busy} onClick={() => void addSuggested(n)}>{n}</button>
            ))}
          </div>
          {actionError ? <p className="field-error" role="alert">{actionError}</p> : null}
        </div>
      ) : null}
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
