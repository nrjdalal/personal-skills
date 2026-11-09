#!/usr/bin/env -S uv run --quiet --with parakeet-mlx --script
"""Score a candidate model against the stored text, on videos already in the store.

    ./benchmark.py mlx-community/parakeet-tdt-0.6b-v2

The store is the test set: its transcripts are the output of the model each file's
`source:` names, and each file's frontmatter carries the uploader's own chapters, tags
and title. Those are ground truth for proper-noun spelling in a way the audio never
is -- the uploader wrote "Homebrew", so a model that emits "homebrew" is wrong and
can be scored.

Each stored text is labelled and totalled by its own `source:`. A file the candidate
itself wrote is left out and named, since it would score the candidate against itself.

Scored on casing RATE, not presence. A model that writes "Homebrew" once at the start
of a sentence and "homebrew" eight times mid-sentence has found the term but gets it
wrong 8 times out of 9, and only a rate catches that. Coverage is reported too, but
the rate is what decides.
"""
import re, subprocess, sys, time
from pathlib import Path

STORE = Path.home() / ".agent-work" / "transcribe"
N = 3

STOP = {"The","This","That","A","An","In","On","At","For","To","Of","And","But","Or",
        "Is","It","Its","You","Your","We","My","How","Why","What","When","Where","New",
        "Not","Do","Does","Can","Why's","Live","Demo","Wrap","Up","Inside","More","Two",
        "First","Look","Final","Intro","Just","Now","So","Here","There","Been","Are"}

def terms(fm_text):
    """Capitalised or mixed-case tokens the uploader wrote -- verifiable spellings."""
    out = set()
    for line in fm_text.splitlines():
        if not re.match(r"^(title|chapters|tags|  - |category)", line):
            continue
        for t in re.findall(r"\b[A-Za-z][A-Za-z0-9.+#]{1,}\b", line):
            if t in STOP or t.islower():
                continue
            if t[0].isupper() or any(c.isupper() for c in t[1:]):
                out.add(t)
    return out

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cand = sys.argv[1]

    files, own = [], []
    for f in sorted(STORE.glob("*.md")):
        head, body = re.split(r"\n---\n", f.read_text(), maxsplit=1)
        m = re.search(r"^source: (\S+)$", head, re.M)
        src = m.group(1) if m else "unknown"
        if src == cand.split("/")[-1]:
            own.append(f.name)
            continue
        files.append((head, body, src))
        if len(files) == N:
            break
    if own:
        print(f"left out {len(own)} file{'s' * (len(own) != 1)} written by the candidate"
              f" itself: {', '.join(own[:3])}{', ...' if len(own) > 3 else ''}")
    if not files:
        sys.exit("no stored file to score against -- the store is the test set,"
                 " and the candidate wrote every file in it" if own else
                 "store is empty -- transcribe something first, the store is the test set")

    from parakeet_mlx import from_pretrained
    try:
        model = from_pretrained(cand)
    except Exception as e:
        print(f"FAIL  {cand} does not load: {e}")
        print("      weights can exist while the runtime refuses the architecture;"
              " check parakeet-mlx for a newer release")
        sys.exit(2)

    rows, tot, elapsed = [], {}, 0.0
    for head, body, src in files:
        vid = re.search(r"^id: (\S+)$", head, re.M).group(1)
        wav = Path(f"{vid}.wav")
        if not wav.exists():
            subprocess.run(["yt-dlp", "-q", "--no-warnings", "-f", "bestaudio", "-x",
                            "--audio-format", "wav", "--postprocessor-args", "-ar 16000 -ac 1",
                            "-o", f"{vid}.%(ext)s",
                            f"https://www.youtube.com/watch?v={vid}"], check=True)
        t0 = time.time()
        new = model.transcribe(str(wav), chunk_duration=120.0, overlap_duration=15.0).text
        elapsed += time.time() - t0

        tset = terms(head)
        r = {}
        for label, text in (("stored", body), ("new", new)):
            ok = bad = 0; misspelled = []
            for t in tset:
                said = re.findall(rf"\b{re.escape(t)}\b", text, re.I)
                if not said:
                    continue
                right = sum(1 for x in said if x == t)
                ok += right; bad += len(said) - right
                if len(said) - right:
                    misspelled.append(f"{t} {right}/{len(said)}")
            r[label] = (ok, bad, sorted(misspelled))
        rows.append((vid, src, r, len(tset)))
        t = tot.setdefault(src, [0, 0, 0, 0, 0])
        t[0] += r["stored"][0]; t[1] += r["stored"][1]
        t[2] += r["new"][0]; t[3] += r["new"][1]; t[4] += 1

    def rate(ok, bad):
        return ok / (ok + bad) if ok + bad else 0.0

    print(f"\n{'video':14}{'stored':>12}{'candidate':>12}")
    for vid, src, r, t in rows:
        print(f"{vid:14}{rate(*r['stored'][:2]):>11.1%}{rate(*r['new'][:2]):>12.1%}"
              f"   (stored by {src}, {t} terms)")
        for label, who in (("stored", src), ("new", "candidate")):
            if r[label][2]:
                print(f"   {who} miscased: {', '.join(r[label][2])}")

    for src, (c, cb, n, nb, k) in tot.items():
        cr, nr = rate(c, cb), rate(n, nb)
        print(f"\nstored by {src}, {k} video{'s' * (k != 1)}\n  -> {cr:.1%} correct casing"
              f"  ({c} right, {cb} wrong)")
        print(f"{cand} on the same videos\n  -> {nr:.1%} correct casing"
              f"  ({n} right, {nb} wrong)")
        print(f"candidate is {'ahead' if nr > cr else 'behind'} by "
              f"{abs(nr - cr) * 100:.1f} points against {src}.")
    print(f"\n[{elapsed:.0f}s compute]")
    print("Numbers only. Switching the model is a person's call and a one-line edit"
          " to SKILL.md that ships to everyone.")

main()
