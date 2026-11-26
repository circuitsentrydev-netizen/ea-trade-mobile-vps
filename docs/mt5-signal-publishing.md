# CircuitSentry — SMC EA v1.082 V3 journal ingestion

## Source-of-truth contract

This integration is based on the uploaded `SMC_EA_SniperScalp_v1_082.mq5` source. The source EA and its V3 journal remain authoritative. Do not modify the EA's trading logic or V3 schema for this integration.

The source journal filename is:

`SMC_SniperScalp_v108_v3_<LOGIN>_<MAGIC>.csv`

It is stored in MT5 Common Files and uses semicolon-delimited CSV. The 18 columns, in exact order, are:

1. `V3`
2. `EVENT_ID`
3. `PARENT_ID`
4. `SETUP_ID`
5. `SYMBOL`
6. `DIR`
7. `TF`
8. `TYPE`
9. `SOURCE_UTC`
10. `CONFIRM_UTC`
11. `SOURCE_BROKER_TIME`
12. `CONFIRM_BROKER_TIME`
13. `LOW`
14. `HIGH`
15. `CONFIG`
16. `VALID`
17. `REASON`
18. `CHECKSUM`

`CONFIG=108` is the EA configuration version. It is not the EA software release. The publisher's `InpEAVersion` is the separate software-release label (for example, `1.082`).

V3 contains zone bounds, not dedicated entry, stop-loss, or take-profit fields. Those prices must remain NULL in the EA-derived signal unless a separate, explicitly identified source supplies them. This integration never invents them.

## Event mapping

The enum ordinals are taken from the source `ENUM_SMC_EVENT`:

| Ordinal | Event | Platform behavior |
|---:|---|---|
| 0 | CREATED | Audit only |
| 1 | LIQUIDITY | Audit only |
| 2 | SWEEP | Audit only |
| 3 | RECLAIM | Audit only |
| 4 | DISPLACEMENT | Audit only |
| 5 | STRUCTURE | Audit only |
| 6 | ZONE | Audit only |
| 7 | MITIGATION | Audit only |
| 8 | REJECTION | Audit only |
| 9 | LTF_CHOCH | Audit only |
| 10 | QUALIFIED | Creates the one client-facing signal for the setup |
| 11 | EXECUTION_PENDING | Updates execution state only |
| 12 | REJECTED | Updates setup status only |
| 13 | EXPIRED | Updates setup status only |
| 14 | EXECUTED | Updates execution state only |
| 15 | INVALIDATED | Updates setup status only |
| 16 | CLOSED | Updates execution state only |

No intermediate event can create a trade signal. Execution and publication are separate states. An EA execution event is reported as an EA event; the platform does not independently verify a broker position.

## Checksum contract

The source method is `CSetupJournal::Checksum(SSMCEvent &e)`. It builds this exact payload, in order, joining fields with a literal pipe:

`eventId|parentEventId|setupId|symbol|direction|EnumToString(timeframe)|eventType|sourceTime|confirmedTime|sourceBrokerTime|confirmedBrokerTime|levelLow|levelHigh|configVersion|valid|reason`

The source uses:
- `(string)` for event, parent, and setup IDs;
- `IntegerToString` for direction, event type, config version, and valid flag;
- `EnumToString` for timeframe (for example, `PERIOD_M5`);
- `TimeToString(value, TIME_DATE|TIME_SECONDS)` for all four timestamps;
- `DoubleToString(value, 8)` for both zone bounds;
- the original reason string;
- initial hash `2166136261`, XOR with each `StringGetCharacter(payload, i)`, then multiply by `16777619` with uint32 overflow.

The server mirrors the UTF-16 code-unit behavior using JavaScript `charCodeAt` and uint32 multiplication. It parses the raw semicolon CSV row and verifies that the JSON event agrees with the original row before accepting the checksum. It does not hash UTF-8 bytes.

## Real-record verification gate

**Real ingestion is intentionally disabled by default.** The API returns `503 real_journal_verification_required` unless the server environment variable `SMC_V3_REAL_JOURNAL_VERIFIED=true` is set.

Do not set that variable based on synthetic fixtures or code inspection alone. First obtain the actual V3 CSV produced by the user's MT5 v1.082 EA and run `npm run verify:smc-v3 -- /path/to/SMC_SniperScalp_v108_v3_<LOGIN>_<MAGIC>.csv`. Preserve the raw sample securely and record the row count, calculated checksum, stored checksum, and result. Only then may an authorized release operator enable real ingestion.

No actual MT5 journal CSV rows were available during this implementation pass, so real-record checksum compatibility has **not** yet been demonstrated.

## Publisher behavior

`mt5/CircuitSentryJournalPublisher.mq5` is a separate read-only EA. It opens the source file with shared read access and never writes to it. It has no order/trade functions. Its default magic number is `91827364`, matching the source file's default `MagicNumber`; set it to the actual EA input if changed.

The publisher:
- reads the exact V3 filename from Common Files;
- parses semicolon CSV with quoted-field handling;
- checks the final line terminator before reading;
- validates the source checksum before forwarding;
- holds its cursor on malformed rows, metadata failures, or checksum failures rather than skipping them;
- keeps its cursor in a separate Common Files cursor file;
- retries when the API is unavailable;
- sends only QUALIFIED and execution/status events by default; intermediate events are never signals;
- does not alter the source journal or EA trading behavior.

## Setup

1. Deploy the app branch after code review and successful build/typecheck.
2. Do not enable `SMC_V3_REAL_JOURNAL_VERIFIED` until real MT5 rows have passed checksum verification.
3. Sign in as an approved mentor and open Mentor Workspace → **Connect your MT5 bot**.
4. Generate a bot token and copy it immediately. Only its SHA-256 hash is stored.
5. Compile `mt5/CircuitSentryJournalPublisher.mq5` in MetaEditor.
6. Attach it to any chart in the same MT5 terminal/account as the source EA.
7. Configure the deployed API URL, mentor bot token, EA software release label, and the exact Magic Number.
8. In MT5 Tools → Options → Expert Advisors, allow WebRequest only to the deployed app origin.
9. Confirm publisher acknowledgements and server-side event audit records.

MetaEditor compilation and a running-terminal test have not been performed in this environment. Do not treat this source as production-verified until those tests and the real-record checksum gate are complete.
