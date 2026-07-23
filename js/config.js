/* ── FIREBASE PROJECT CONFIG ──
   These values identify the Firebase project (Realtime Database URL + Web API key).
   Note: Firebase Web API keys are safe to expose client-side by design — they are
   not a secret credential. Actual data access is controlled by Firebase Realtime
   Database Rules on the project itself, not by hiding this value.
   Kept in its own file so it's easy to swap between dev/staging/prod projects. */

   
const FIREBASE_URL = 'https://omcr-queue-default-rtdb.asia-southeast1.firebasedatabase.app';
const FB_API_KEY = 'AIzaSyBuraVhdqJizUAVELWfxVBA_1kvPZfg2xo';