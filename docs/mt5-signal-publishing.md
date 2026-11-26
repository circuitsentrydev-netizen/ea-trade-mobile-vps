# Publishing mentor signals directly from MT5

The platform now exposes an authenticated endpoint for an approved mentor's EA:

- Method: `POST`
- Path: `/api/mentor/signals`
- Header: `Authorization: Bearer <mentor bot token>`
- Content type: `application/json`

Example body:

```json
{
  "symbol": "XAUUSD",
  "direction": "SELL",
  "entry": 4025.50,
  "stop_loss": 4032.00,
  "take_profit": 4012.00,
  "notes": "Confirmed sweep and bearish displacement",
  "expiry_hours": 24
}
```

A successful response is HTTP 201 and includes the created signal. Invalid tokens return 401; non-approved mentors return 403; invalid price geometry returns 400.

## MT5 setup

1. In the mentor workspace, open **Connect your MT5 bot** and generate a token.
2. Copy the token immediately. It is stored hashed and cannot be retrieved later.
3. Set the endpoint to your deployed app's full URL plus `/api/mentor/signals`.
4. Add your deployed app domain to MT5: **Tools → Options → Expert Advisors → Allow WebRequest for listed URL**.
5. Include `mt5/CircuitSentrySignalPublisher.mqh` in the mentor EA.
6. Set `CS_MentorBotToken` securely in the EA inputs and call `CS_PublishSignal()` only after the EA has confirmed a signal.
7. Check the EA Experts log for HTTP 201 or an error.

**Security:** Treat the bot token like a password. Do not hardcode it in a publicly distributed EA or share an EX5 containing a personal mentor token. Prefer a private configuration mechanism. Rotate the token immediately if exposed.

**Important:** The publisher sends signal data to the platform; it does not place or copy trades. A successful HTTP 201 confirms the signal was saved, not that any broker order was executed.
