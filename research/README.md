# research

Parked research, kept out of the build. Nothing here is imported by `src/`, run by CI,
or wired into `package.json`.

- `reqtoken/`: requirement-token v2 exploration scripts (render, emit, portability) and
  the last emitted output (`reqtoken.tokens.json`). `reqtoken-emit.ts` runs clean;
  `reqtoken-render.ts` and `reqtoken-portability.ts` predate later engine rounds and hit
  runtime errors on drifted stop/role assumptions (bit rot from before the move here).
- `p3/`: closed P3 master-gamut round docs.
- `update-check/`: parked network half of the extended plugin update-notification
  round (2026-09-01): CI `version.json` + manifest network grant + UI fetch. The
  offline build-stamp half ships in the plugin; this resumes only on explicit go.
