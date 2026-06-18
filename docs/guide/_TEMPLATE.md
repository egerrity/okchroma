# <Topic name>

> Template for every engineering-guide topic. `Concept` / `Why` / `How` are
> audience-neutral; `Engineering` is the depth. The design audience is served by a
> single consolidated doc, [`for-designers.md`](./for-designers.md), not a per-topic
> design section.
>
> Voice: utilitarian, understandable, brief. Say the thing and stop. Avoid em
> dashes; if you reach for one, you're saying too much. Cut clauses that don't add
> a fact. Delete this blockquote when filling the template in.

## Concept

One or two plain sentences: what this part of the engine does, in language either
audience understands. No jargon yet.

## Why

The motivation: the problem this solves, why it matters. One or two sentences. The
reason it exists, not the mechanism. (If you're describing how it works, that
belongs in How or Engineering.)

## How

The approach in plain terms: what we do about the Why. Name the inspiration/prior
art and the core idea. No formulas or code here. The design audience should get the
whole approach from this section.

## Engineering

The computation. Mechanic, then core formula, then source, then worked example.

- **Mechanic:** how it actually computes, step by step.
- **Formula:** the load-bearing math only (not every constant).
- **Source:** `path/to/file.ts` → `functionName()` (cite the symbol; line numbers
  drift). List each function a reader should open.
- **Worked example:** a real input run through the engine, with numbers that
  reproduce from the code (regenerate, don't hand-wave). A small swatch/table.

---

**Provenance:** internal decision record(s) this topic draws from (link, don't
inline; those stay archive). **See also:** related guide topics.
