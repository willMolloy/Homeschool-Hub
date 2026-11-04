import { useApiEngineVersion, EngineFooter, EngineMismatchBanner } from "./EngineVersion";
import { AppShell } from "./AppShell";
import { UndoBar } from "../features/undo/UndoBar";
import { UndoProvider, useUndo } from "../features/undo/UndoProvider";
import { NeedsYouProvider, useNeedsYou } from "../features/completion/NeedsYou";

/** The app shell with S6-08's undo bar and the engine-version banner. Sign out lives behind the family button on Home (S8-04). */
export function SignedInShell() {
  return (
    <UndoProvider>
      <NeedsYouProvider>
        <Shell />
      </NeedsYouProvider>
    </UndoProvider>
  );
}

function Shell() {
  const apiEngineVersion = useApiEngineVersion();
  const { round } = useUndo();
  const needsYou = useNeedsYou();
  return (
    <AppShell
      banner={<><EngineMismatchBanner apiVersion={apiEngineVersion} /><UndoBar /></>}
      contentKey={round}
      needsYou={needsYou}
      footer={<EngineFooter />}
    />
  );
}
