// CircuitSentry mentor signal publisher for MetaTrader 5.
// Include this file in a mentor EA, configure the endpoint in MT5 WebRequest
// allowed URLs, and call CS_PublishSignal() only when the EA confirms a setup.

input string CS_SignalEndpoint = "https://YOUR-APP-DOMAIN/api/mentor/signals";
input string CS_MentorBotToken = "";

bool CS_PublishSignal(const string symbol,
                      const string direction,
                      const double entry,
                      const double stop_loss,
                      const double take_profit,
                      const string notes = "",
                      const int expiry_hours = 24)
{
   if(CS_MentorBotToken == "")
   {
      Print("CircuitSentry: mentor bot token is not configured.");
      return false;
   }

   if(direction != "BUY" && direction != "SELL")
   {
      Print("CircuitSentry: direction must be BUY or SELL.");
      return false;
   }

   if(entry <= 0 || stop_loss <= 0 || take_profit <= 0)
   {
      Print("CircuitSentry: entry, stop loss and target must be positive.");
      return false;
   }

   if(direction == "BUY" && !(stop_loss < entry && take_profit > entry))
   {
      Print("CircuitSentry: invalid BUY price levels.");
      return false;
   }
   if(direction == "SELL" && !(stop_loss > entry && take_profit < entry))
   {
      Print("CircuitSentry: invalid SELL price levels.");
      return false;
   }

   string safe_notes = notes;
   StringReplace(safe_notes, "\\", "\\\\");
   StringReplace(safe_notes, "\"", "\\\"");
   StringReplace(safe_notes, "\r", " ");
   StringReplace(safe_notes, "\n", " ");

   string body = "{"
      + "\"symbol\":\"" + symbol + "\","
      + "\"direction\":\"" + direction + "\","
      + "\"entry\":" + DoubleToString(entry, 8) + ","
      + "\"stop_loss\":" + DoubleToString(stop_loss, 8) + ","
      + "\"take_profit\":" + DoubleToString(take_profit, 8) + ","
      + "\"notes\":\"" + safe_notes + "\","
      + "\"expiry_hours\":" + IntegerToString(expiry_hours)
      + "}";

   char data[];
   int copied = StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   if(copied > 0)
      ArrayResize(data, copied - 1);

   char result[];
   string response_headers;
   string headers = "Content-Type: application/json\r\n"
      + "Authorization: Bearer " + CS_MentorBotToken + "\r\n";

   ResetLastError();
   int status = WebRequest("POST", CS_SignalEndpoint, headers, 10000,
                           data, result, response_headers);

   if(status == -1)
   {
      PrintFormat("CircuitSentry: WebRequest failed. MT5 error %d. Add the app domain to Tools > Options > Expert Advisors > Allow WebRequest.", GetLastError());
      return false;
   }

   string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   if(status != 201)
   {
      PrintFormat("CircuitSentry: signal publish rejected. HTTP %d: %s", status, response);
      return false;
   }

   Print("CircuitSentry: mentor signal published successfully: ", response);
   return true;
}
