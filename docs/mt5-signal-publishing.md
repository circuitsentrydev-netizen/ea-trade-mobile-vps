# CircuitSentry — MT5 V3 journal publisher

## Architecture and safety

`CircuitSentryJournalPublisher.mq5` is a separate, read-only MT5 Expert Advisor. It polls the SMC EA's existing V3 CSV journal from MT5 Common Files and sends journal records to the hosting app. It does not modify the source EA, its settings, or its journal, and it contains no trade/order functions.

The source EA's journal filename is:

`SMC_SniperScalp_v108_v3_<ACCOUNT_LOGIN>_<MagicNumber>.csv`

The publisher derives this automatically when `InpJournalFile` is blank. Its default magic number matches the uploaded `SMC_EA_SniperScalp_v1_082` source (91827364). If the source EA uses another magic number, set `InpMagicNumber` to the exact value.

## Publication rules

- Only event type `10` (`SMC_EVT_QUALIFIED`) creates a signal.
- Liquidity, sweep, reclaim, displacement, structure, zone, mitigation, rejection, and LTF CHoCH events are never published as trade signals.
- Event types `12`, `13`, `14`, and `15` are status events only: REJECTED, EXPIRED, EXECUTED, and INVALIDATED.
- Execution status is stored separately from signal publication status.
- No entry, stop-loss, or take-profit is inferred. Those database fields remain NULL unless an independent source supplies them.
- The original source/confirmation UTC times, broker times, zone bounds, reason, config version, V3 schema marker, checksum, and raw journal line are retained.

## Install and configure

1. Deploy the current CircuitSentry app and apply all migrations in `supabase/migrations`.
2. Sign in as an approved mentor and open Mentor Workspace → **Connect your MT5 bot**.
3. Generate a bot token and copy it immediately. The app stores only its SHA-256 hash; it cannot show the token again.
4. In MT5, open **File → Open Data Folder**, then navigate to `MQL5/Experts`.
5. Copy `mt5/CircuitSentryJournalPublisher.mq5` from this repository into that folder and compile it in MetaEditor.
6. Attach the publisher EA to any chart on the same MT5 terminal/account as the source SMC EA. It is a timer-driven file reader; it does not trade on the chart symbol.
7. Set:
   - `InpApiEndpoint`: your deployed app URL plus `/api/mentor/signals`.
   - `InpMentorBotToken`: the one-time token from the mentor workspace.
   - `InpEAVersion`: the source EA version label (default `1.082`).
   - `InpMagicNumber`: same magic number as the source EA (default `91827364`).
   - `InpJournalFile`: leave blank for automatic filename, or specify the exact Common Files filename.
8. In MT5 **Tools → Options → Expert Advisors**, enable **Allow WebRequest for listed URL** and add only your deployed app origin (for example `https://app.example.com`).
9. Check the publisher's Experts log for batch acknowledgements. It never prints the bot token.

## Reliability and recovery

- The publisher validates the V3 FNV-1a checksum before forwarding records; the API independently recomputes and verifies it.
- It reads the source file with shared read access. It never opens the source journal for writing.
- A final row without a line terminator, an incomplete row, or a checksum-invalid row is not forwarded as a signal. An incomplete final row is retried on the next poll.
- A separate cursor file is written under Common Files. It is not the source journal. If the API is unavailable or returns a retryable database error, the cursor is not advanced and the batch is replayed.
- Database unique indexes on mentor + event ID and mentor + setup ID prevent duplicate publication if the terminal restarts or an acknowledgement is lost.
- Intermediate event types are scanned but never published as signals.
- Status events arriving before their qualified event are ignored; the later qualified event remains the only signal-creation event.

## API payload and audit

The publisher posts batches to `POST /api/mentor/signals` using `Authorization: Bearer <token>`. The API validates mentor approval, event shape, timestamps, and the same journal checksum before storing. The raw qualified record is retained in `raw_event`; later status records are stored separately in `latest_status_event`.

The client feed distinguishes:
- **QUALIFIED · PUBLISHED** — the EA journal confirmed the setup and the platform stored it.
- **EXPIRED / INVALIDATED / REJECTED** — a later EA journal event updated the setup status.
- **EXECUTED (confirmed by EA)** — only after an `SMC_EVT_EXECUTED` record is received.
- **NOT CONFIRMED** — no execution event has been received. This is not presented as proof of a failed trade.

A journal's `SMC_EVT_EXECUTED` means the EA recorded broker acceptance in its own execution flow; the platform does not independently query the broker to verify a live position.

## Offline independence

The publisher is separate from the trading EA. If the hosting app, API, network, or publisher is offline, the source EA continues its own strategy and journal writes. The publisher catches up from the append-only journal when it resumes. It never sends, modifies, or closes orders.
