import type { ReactNode } from "react";
import styles from "./PageShell.module.css";

/* ============================================================================
   The ruled page. Both screens are the same picture — a 912px column between
   two flanks, ruled by hairlines — so the picture lives here and not in each
   screen's stylesheet, where the two would drift.

   Geometry and the drawing rule are documented in PageShell.module.css.
   ========================================================================= */

/** One flank pair. Only the inner cell rules; the column draws the boundary
 *  beside it. `block` adds the horizontals that run out from a card's edges. */
function Flanks({ block }: { block?: boolean }) {
  const cls = block ? `${styles.flank} ${styles.flankBlock}` : styles.flank;
  return (
    <>
      <div className={cls} aria-hidden />
      <div className={`${cls} ${styles.flankRule}`} aria-hidden />
    </>
  );
}

/** Empty ruled ground above and below the cards. */
export function Band() {
  return (
    <div className={styles.band}>
      <Flanks />
      <div className={styles.bandColumn} aria-hidden />
      <Flanks />
    </div>
  );
}

/** A card row: flanks, the card, flanks. Its child must carry `shellColumn`. */
export function Row({ children }: { children: ReactNode }) {
  return (
    <div className={styles.row}>
      <Flanks block />
      {children}
      <Flanks block />
    </div>
  );
}

/** Apply to the element that sits in the column — it gets the white face,
 *  the box, and the column's width. Padding and gap stay with the screen. */
export const shellColumn = styles.column;

/** Apply to the page's <main>. */
export const shellPage = styles.page;
