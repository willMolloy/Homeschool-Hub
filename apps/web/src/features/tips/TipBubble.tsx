/**
 * S11-06: a small hint bubble with "Got it". Not a dialog and no overlay: it never blocks the screen or traps focus; it is a
 * status message (read out politely when it appears) with a button that can be reached by keyboard.
 */
import type { CSSProperties } from "react";
import "./tips.css";

export interface TipBubbleProps {
  text: string;
  onGotIt: () => void;
  /** Where it sits: in the flow (inside the edit sheet) or placed over the timeline at a point. */
  style?: CSSProperties;
  className?: string;
  /** Which way the pointer of the bubble points (the bubble sits on the other side of what it names). */
  arrow?: "up" | "left" | "none";
  /** How far along the bubble its pointer is, px. */
  arrowAt?: number;
}

export function TipBubble({ text, onGotIt, style, className, arrow = "none", arrowAt = 24 }: TipBubbleProps) {
  return (
    <div className={["tip", className].filter(Boolean).join(" ")} role="status" data-tip data-arrow={arrow} style={{ ...style, "--tip-arrow-at": `${arrowAt}px` } as CSSProperties}>
      <p className="tip-text">{text}</p>
      <button type="button" className="tip-got" onClick={onGotIt}>Got it</button>
    </div>
  );
}
