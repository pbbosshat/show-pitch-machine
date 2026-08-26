// The LinkedIn invite-note cap, and the one function that enforces it.
//
// Policy (2026-08-26, per Courtney): notes are ALWAYS 200 characters or fewer.
// We never flag an over-length note back at the user — we shorten it. So this
// helper is called everywhere a note enters the system: at generation, on load
// into the editor, on save, and immediately before it is handed to the queue.
export const LI_NOTE_CAP = 200;

/**
 * Shorten a LinkedIn invite note to at most `cap` characters.
 *
 * A note is built as: opener ("Hi Dana.") + one or more personal lines + a
 * closing question. The opener and the question are the parts that make it
 * work, so when we have to cut we drop MIDDLE sentences and keep those two
 * intact — longest middle first, so we shed the most length for the fewest
 * sentences lost. Only if opener + question alone still overflow do we fall
 * back to a word-boundary trim, and even then it ends on real punctuation
 * rather than mid-word.
 */
export function capLiNote(raw: string | null | undefined, cap = LI_NOTE_CAP): string {
  const note = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (note.length <= cap) return note;

  // Split into sentences, keeping their terminal punctuation. The final
  // alternative catches a trailing fragment with no punctuation at all.
  const parts = (note.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [note]).map((s) => s.trim()).filter(Boolean);

  // Many notes end on the bare sign-off "Shawn" with no full stop. Left alone,
  // the splitter would treat that as the closing sentence and the middle-drop
  // below would keep it while discarding the actual question. Glue any short,
  // unpunctuated tail back onto the sentence it belongs to.
  if (parts.length > 1) {
    const tail = parts[parts.length - 1];
    if (tail.length <= 20 && !/[.!?]$/.test(tail)) {
      parts.splice(parts.length - 2, 2, `${parts[parts.length - 2]} ${tail}`);
    }
  }

  if (parts.length > 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const middles = parts.slice(1, -1);
    // Shed the longest middle sentence repeatedly until the note fits.
    while (middles.length) {
      let longest = 0;
      for (let i = 1; i < middles.length; i++) {
        if (middles[i].length > middles[longest].length) longest = i;
      }
      middles.splice(longest, 1);
      const candidate = [first, ...middles, last].join(' ');
      if (candidate.length <= cap) return candidate;
    }
    // Every middle is gone. Opener + question may now fit on their own.
    const bare = `${first} ${last}`;
    if (bare.length <= cap) return bare;
  }

  // One runaway sentence, or an opener + question that together still overflow.
  // Cut on a word boundary and close it off.
  const trimmed = note.slice(0, cap).replace(/\s+\S*$/, '').replace(/[\s,;:—–-]+$/, '').trim();
  if (!trimmed) return note.slice(0, cap).trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`.slice(0, cap);
}
