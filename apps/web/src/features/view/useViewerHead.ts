/** S15-03: while a viewer is signed in, the page tells search engines not to index it and sends no referrer (the API says the same in headers). */
import { useEffect } from "react";

export function useViewerHead(viewer: boolean): void {
  useEffect(() => {
    if (!viewer) return;
    const tags = [["robots", "noindex, nofollow"], ["referrer", "no-referrer"]].map(([name, content]) => {
      const meta = document.createElement("meta");
      meta.name = name!;
      meta.content = content!;
      document.head.appendChild(meta);
      return meta;
    });
    return () => { tags.forEach((m) => m.remove()); };
  }, [viewer]);
}
