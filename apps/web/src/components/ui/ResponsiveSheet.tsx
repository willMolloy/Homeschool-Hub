/**
 * A sheet that is a bottom Drawer on phones and a centred Dialog on wider screens (T-03b), both from Base UI.
 * Controlled: the caller owns `open`. Callers don't know which one renders, so swapping either is local.
 */
import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";
import { useMediaQuery } from "../../lib/useMediaQuery";
import "./sheet.css";

/** Under this width the sheet is a Drawer. */
export const PHONE_QUERY = "(max-width: 639px)";

export interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
}

export function ResponsiveSheet({ open, onOpenChange, title, children }: ResponsiveSheetProps) {
  const phone = useMediaQuery(PHONE_QUERY);
  if (phone) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
        <Drawer.Portal>
          <Drawer.Backdrop className="sheet-backdrop" />
          <Drawer.Viewport className="sheet-viewport sheet-viewport-drawer">
            <Drawer.Popup className="sheet-popup sheet-drawer" data-sheet="drawer">
              <Drawer.Content>
                <div className="sheet-head">
                  <Drawer.Title className="sheet-title">{title}</Drawer.Title>
                  <Drawer.Close className="sheet-close" aria-label="Close">×</Drawer.Close>
                </div>
                {children}
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup className="sheet-popup sheet-dialog" data-sheet="dialog">
          <div className="sheet-head">
            <Dialog.Title className="sheet-title">{title}</Dialog.Title>
            <Dialog.Close className="sheet-close" aria-label="Close">×</Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
