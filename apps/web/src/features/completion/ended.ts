/** S12-04/S12-06: how an ended assignment is worded: "Finished Nov 2", "Stopped Oct 30". */
import { formatShort } from "../../lib/dates";

export const endedWords = (endedAs: "finished" | "stopped", endedOn: string): string =>
  `${endedAs === "finished" ? "Finished" : "Stopped"} ${formatShort(endedOn)}`;
