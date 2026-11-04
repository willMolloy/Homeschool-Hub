/**
 * S13-05: `/records/review`, Term in review as its own full-screen page (Will, 2026-11-05; not a sheet). A header with a back link
 * to Records and the title; the range and child chips; the card as large as fits (one card per child, arrows or a swipe between them
 * with All children); Print and Save image at the bottom. The saved image and the printed page are always the light card; only this
 * preview follows a dark device. Everything is made on this device: no upload, no link.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CaretLeft, CaretRight, Lock, Printer, ImageSquare } from "@phosphor-icons/react";
import { useApi } from "../../api/useApi";
import type { Assignment, Child, FamilySettings, Subject } from "../../api/types";
import { useMe } from "../../auth/AuthProvider";
import { Button, Chip } from "../../ui/components";
import { ALL, shownChoice } from "../week/useChildChoice";
import { ChildSwitch } from "../week/ChildSwitch";
import { rangeOptions } from "../records/ranges";
import { layoutCard } from "./cardLayout";
import { cardToPng, fileNameFor, saveImages } from "./exportCard";
import { TermCardSvg } from "./TermCardSvg";
import { partCount } from "./termReview";
import { useCardMeasure } from "./useCardMeasure";
import { useTermReviews } from "./useTermReviews";
import "./review.css";

function useDarkDevice(): boolean {
  const [dark, setDark] = useState(() => { try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch { return false; } });
  useEffect(() => {
    let mq: MediaQueryList;
    try { mq = window.matchMedia("(prefers-color-scheme: dark)"); } catch { return; }
    const on = () => setDark(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return dark;
}

/** The theme the preview is drawn in: the app's chosen theme (data-theme), else the device's. */
function usePreviewTheme(): "light" | "dark" {
  const device = useDarkDevice();
  const [attr, setAttr] = useState(() => document.documentElement.getAttribute("data-theme"));
  useEffect(() => {
    const obs = new MutationObserver(() => setAttr(document.documentElement.getAttribute("data-theme")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return attr === "dark" || (attr !== "light" && device) ? "dark" : "light";
}

export function TermReviewPage() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const family = useApi<FamilySettings>("/api/family");
  const subjects = useApi<Subject[]>("/api/subjects");
  const children = useApi<Child[]>("/api/children");
  const assignments = useApi<Assignment[]>("/api/assignments");
  const kids = (children.data ?? []).filter((c) => !c.archived);
  const options = useMemo(() => (family.data && assignments.data
    ? rangeOptions({ views: family.data.zoomViews, assignments: assignments.data, today: me.today, weekStart: me.weekStart }).filter((o) => o.key !== "week")
    : []), [family.data, assignments.data, me.today, me.weekStart]);
  const asked = params.get("range");
  const picked = options.find((o) => o.key === asked) ?? options.find((o) => o.key === "year");
  const range = picked ? { start: picked.start, end: picked.end } : null;
  const choice = shownChoice(kids, params.get("child"), "all");
  const chosenKids = choice === null ? [] : choice === ALL ? kids : kids.filter((k) => k.id === choice);
  const set = (next: Record<string, string>) => setParams((p) => { const q = new URLSearchParams(p); for (const [k, v] of Object.entries(next)) q.set(k, v); return q; }, { replace: true });
  const { reviews, failed } = useTermReviews({ kids: chosenKids, range, assignments: assignments.data, subjects: subjects.data, family: family.data });
  const { measure, ready: fontsReady } = useCardMeasure();
  const theme = usePreviewTheme();
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const swipe = useRef<number | null>(null);

  const backTo = `/records?${new URLSearchParams({ ...(asked ? { range: asked } : {}), ...(params.get("child") ? { child: params.get("child")! } : {}) }).toString()}`;
  const layouts = useMemo(() => {
    if (!reviews || !subjects.data || !picked || !fontsReady) return null;
    const make = (t: "light" | "dark") => reviews.filter((r) => partCount(r) > 0).map((r) => ({
      review: r, layout: layoutCard({ review: r, rangeLabel: picked.label, isYear: picked.key === "year", subjects: subjects.data!, theme: t, measure }),
    }));
    return { shown: make(theme), light: theme === "light" ? null : make("light") };
  }, [reviews, subjects.data, picked, fontsReady, measure, theme]);
  const cards = layouts?.shown ?? [];
  const printCards = layouts ? layouts.light ?? layouts.shown : [];
  const empty = (reviews ?? []).filter((r) => partCount(r) === 0);
  const at = Math.min(index, Math.max(0, cards.length - 1));
  useEffect(() => { setIndex(0); setNote(null); }, [asked, choice]);

  const labelOf = (title: string) => `${title}, term in review`;
  const save = async () => {
    if (printCards.length === 0 || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const files = await Promise.all(printCards.map(async ({ layout }) => new File([await cardToPng(layout, labelOf(layout.title))], fileNameFor(layout.title, picked?.key === "year"), { type: "image/png" })));
      const how = await saveImages(files);
      setNote(how === "cancelled" ? null : how === "shared" ? "Shared from this device." : files.length === 1 ? "Saved to this device." : `Saved ${files.length} images to this device.`);
    } catch {
      setNote("Couldn't make the image on this device. Print the card instead, or try again.");
    } finally {
      setBusy(false);
    }
  };

  const failedLoad = family.error || subjects.error || children.error || assignments.error || failed;
  const loading = !family.data || !subjects.data || !children.data || !assignments.data;
  const many = cards.length > 1;
  return (
    <div className="review-page">
      <header className="review-head no-print">
        <Link className="review-back" to={backTo}><span aria-hidden="true">‹</span> Records</Link>
        <h1>Term in review</h1>
      </header>
      <main className="review-body no-print">
        {failedLoad ? (
          <div className="form-error" role="alert"><p>Couldn&apos;t load the review.</p><Button variant="secondary" onClick={() => { family.reload(); subjects.reload(); children.reload(); assignments.reload(); }}>Retry</Button></div>
        ) : loading ? <p aria-busy="true">Loading…</p> : kids.length === 0 ? (
          <p className="review-empty">Add a child first: each card is for a child. <Link to="/setup/children">Add a child</Link></p>
        ) : (
          <>
            <div className="range-chips" role="group" aria-label="Range">
              {options.map((o) => <Chip key={o.key} selected={picked?.key === o.key} onClick={() => set({ range: o.key })}>{o.label}</Chip>)}
            </div>
            <ChildSwitch kids={kids} value={choice} onChange={(v) => set({ child: v })} />
            {empty.length > 0 && reviews ? (
              <p className="review-empty" role="status">
                {empty.length === reviews.length && reviews.length === 1
                  ? `Nothing to show for ${empty[0]!.childName} yet. Finished work, and what you log in Records, appears here.`
                  : `Nothing yet for ${empty.map((e) => e.childName).join(", ")}. Finished work, and what you log in Records, appears here.`}
              </p>
            ) : null}
            {cards.length > 0 ? (
              <div className="review-stage" onTouchStart={(e) => { swipe.current = e.touches[0]?.clientX ?? null; }}
                onTouchEnd={(e) => { const s = swipe.current; swipe.current = null; const x = e.changedTouches[0]?.clientX; if (s !== null && x !== undefined && many && Math.abs(x - s) > 50) setIndex(Math.max(0, Math.min(cards.length - 1, at + (x < s ? 1 : -1)))); }}>
                <div className="review-card" aria-live="polite">
                  <TermCardSvg layout={cards[at]!.layout} label={labelOf(cards[at]!.layout.title)} />
                </div>
              </div>
            ) : reviews && layouts ? null : <p aria-busy="true">Getting the card ready…</p>}
            {many ? (
              <div className="review-pager">
                <button type="button" className="round-btn" aria-label="Previous card" disabled={at === 0} onClick={() => setIndex(at - 1)}><CaretLeft size={20} weight="light" aria-hidden="true" /></button>
                <span className="review-dots" role="status" aria-label={`Card ${at + 1} of ${cards.length}: ${cards[at]!.review.childName}`}>{cards.map((c, i) => <i key={c.review.childId} className={i === at ? "on" : ""} />)}</span>
                <button type="button" className="round-btn" aria-label="Next card" disabled={at === cards.length - 1} onClick={() => setIndex(at + 1)}><CaretRight size={20} weight="light" aria-hidden="true" /></button>
              </div>
            ) : null}
          </>
        )}
      </main>
      <footer className="review-foot no-print">
        <p className="review-privacy"><Lock size={16} weight="light" aria-hidden="true" /> Made on this device. Nothing is uploaded.</p>
        {note ? <p className="review-note" role="status">{note}</p> : null}
        <div className="review-actions">
          <Button variant="secondary" disabled={printCards.length === 0} onClick={() => window.print()}><Printer size={20} weight="light" aria-hidden="true" /> {printCards.length > 1 ? `Print ${printCards.length} pages` : "Print"}</Button>
          <Button disabled={printCards.length === 0 || busy} onClick={() => void save()}><ImageSquare size={20} weight="light" aria-hidden="true" /> {busy ? "Making…" : printCards.length > 1 ? `Save ${printCards.length} images` : "Save image"}</Button>
        </div>
      </footer>
      {/* Print: one light card per page, whatever the screen shows. */}
      <div className="review-print" aria-hidden="true">
        {printCards.map(({ layout }) => <div key={layout.title} className="review-print-page"><TermCardSvg layout={layout} label={layout.title} /></div>)}
      </div>
    </div>
  );
}
