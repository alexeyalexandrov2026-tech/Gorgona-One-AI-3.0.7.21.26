'use client';

// The build-time constant is replaced by Next before webpack resolves imports.
// With the pilot off, no gt-next module enters the server/client graph.
let Boundary;
if (process.env.MIAMI_I18N_PILOT === '1') {
  Boundary = require('./GTBoundary').default;
}

export default function PilotBoundary({ snapshots }) {
  return Boundary ? <Boundary snapshots={snapshots} /> : null;
}
