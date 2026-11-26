//+------------------------------------------------------------------+
//| CircuitSentryJournalPublisher.mq5                                |
//| Read-only publisher for the SMC EA V3 append-only Common journal. |
//| This EA never sends, modifies or closes trading orders.           |
//+------------------------------------------------------------------+
#property strict
#property version   "1.00"
#property description "Read-only SMC V3 journal signal publisher"

input string InpJournalFile = ""; // Leave blank to derive the EA journal filename.
input long   InpMagicNumber = 91827364;
input string InpApiEndpoint = "https://YOUR-APP-DOMAIN/api/mentor/signals";
input string InpMentorBotToken = "";
input string InpEAVersion = "1.082";
input int    InpPollSeconds = 5;
input int    InpBatchSize = 50;
input bool   InpPublishStatusEvents = true;

ulong g_cursor = 0;
string g_cursor_file = "";

string TrimQuotes(string value)
{
   StringReplace(value, "\"", "");
   return value;
}

string JsonEscape(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", " ");
   StringReplace(value, "\n", " ");
   return value;
}

bool ParseCsvLine(string line,string &fields[])
{
   ArrayResize(fields,0);
   string current="";
   bool quoted=false;
   int length=StringLen(line);
   for(int i=0;i<length;i++)
   {
      ushort ch=(ushort)StringGetCharacter(line,i);
      if(ch==34)
      {
         if(quoted && i+1<length && StringGetCharacter(line,i+1)==34)
         {
            current+=CharToString(34);
            i++;
         }
         else quoted=!quoted;
      }
      else if(ch==59 && !quoted)
      {
         int n=ArraySize(fields);
         ArrayResize(fields,n+1);
         fields[n]=current;
         current="";
      }
      else current+=StringSubstr(line,i,1);
   }
   if(quoted) return false;
   int n=ArraySize(fields);
   ArrayResize(fields,n+1);
   fields[n]=current;
   return true;
}

uint JournalChecksum(string &f[])
{
   // Exact V3 checksum contract from SMC_EA_SniperScalp v1.082.
   string payload=f[1]+"|"+f[2]+"|"+f[3]+"|"+f[4]+"|"+f[5]+"|"+f[6]+"|"+f[7]+"|"+
      f[8]+"|"+f[9]+"|"+f[10]+"|"+f[11]+"|"+f[12]+"|"+f[13]+"|"+f[14]+"|"+f[15]+"|"+f[16];
   uint hash=(uint)2166136261;
   for(int i=0;i<StringLen(payload);i++)
   {
      hash^=(uint)StringGetCharacter(payload,i);
      hash*=16777619;
   }
   return hash;
}

string ToISO8601UTC(string value)
{
   // V3 journal stores UTC as YYYY.MM.DD HH:MI:SS.
   return value;
}

string EventJSON(string &f[],string rawLine)
{
   int direction=(int)StringToInteger(f[5]);
   string dir=(direction>0 ? "BUY" : "SELL");
   return "{"
      + "\"eventId\":\"" + f[1] + "\","
      + "\"parentEventId\":\"" + f[2] + "\","
      + "\"setupId\":\"" + f[3] + "\","
      + "\"symbol\":\"" + JsonEscape(f[4]) + "\","
      + "\"direction\":\"" + dir + "\","
      + "\"timeframe\":\"" + JsonEscape(f[6]) + "\","
      + "\"eventType\":" + f[7] + ","
      + "\"sourceUtc\":\"" + ToISO8601UTC(f[8]) + "\","
      + "\"confirmedUtc\":\"" + ToISO8601UTC(f[9]) + "\","
      + "\"sourceBrokerTime\":\"" + ToISO8601UTC(f[10]) + "\","
      + "\"confirmedBrokerTime\":\"" + ToISO8601UTC(f[11]) + "\","
      + "\"zoneLow\":" + f[12] + ","
      + "\"zoneHigh\":" + f[13] + ","
      + "\"configVersion\":" + f[14] + ","
      + "\"valid\":" + (f[15]=="1" ? "true" : "false") + ","
      + "\"reason\":\"" + JsonEscape(f[16]) + "\","
      + "\"checksum\":" + f[17] + ","
      + "\"eaVersion\":\"" + JsonEscape(InpEAVersion) + "\","
      + "\"journalSchemaVersion\":\"V3\","
      + "\"rawLine\":\"" + JsonEscape(rawLine) + "\""
      + "}";
}

bool LoadCursor()
{
   int h=FileOpen(g_cursor_file,FILE_READ|FILE_TXT|FILE_COMMON|FILE_ANSI);
   if(h==INVALID_HANDLE) { g_cursor=0; return true; }
   string value=FileReadString(h);
   FileClose(h);
   g_cursor=(ulong)StringToInteger(value);
   return true;
}

bool SaveCursor(ulong value)
{
   int h=FileOpen(g_cursor_file,FILE_WRITE|FILE_TXT|FILE_COMMON|FILE_ANSI);
   if(h==INVALID_HANDLE)
   {
      Print("CS_PUBLISHER | cannot save cursor; next poll will safely replay events");
      return false;
   }
   FileWriteString(h,(string)value);
   FileFlush(h);
   FileClose(h);
   g_cursor=value;
   return true;
}

bool JournalHasCompleteFinalLine()
{
   int h=FileOpen(InpJournalFile,FILE_READ|FILE_BIN|FILE_COMMON|FILE_SHARE_READ|FILE_SHARE_WRITE);
   if(h==INVALID_HANDLE) return false;
   ulong size=FileSize(h);
   if(size==0) { FileClose(h); return true; }
   FileSeek(h,(long)size-1,SEEK_SET);
   int last=FileReadInteger(h,CHAR_VALUE);
   FileClose(h);
   return (last==10); // FileWrite CSV rows terminate with LF (CRLF also ends in LF).
}

bool IsPublishableType(int eventType)
{
   if(eventType==10) return true; // SMC_EVT_QUALIFIED only as a new signal.
   if(!InpPublishStatusEvents) return false;
   return (eventType==12 || eventType==13 || eventType==14 || eventType==15);
}

bool SendBatch(string &jsonEvents[],ulong maxEventId)
{
   int n=ArraySize(jsonEvents);
   if(n<=0) return true;
   string body="{\"events\":[";
   for(int i=0;i<n;i++)
   {
      if(i>0) body+=",";
      body+=jsonEvents[i];
   }
   body+="]}";

   char data[];
   int copied=StringToCharArray(body,data,0,WHOLE_ARRAY,CP_UTF8);
   if(copied>0) ArrayResize(data,copied-1);
   char response[];
   string responseHeaders;
   string headers="Content-Type: application/json\r\nAuthorization: Bearer "+InpMentorBotToken+"\r\n";
   ResetLastError();
   int status=WebRequest("POST",InpApiEndpoint,headers,15000,data,response,responseHeaders);
   if(status!=200)
   {
      PrintFormat("CS_PUBLISHER | API unavailable/rejected HTTP=%d MT5Error=%d; journal untouched; will retry",status,GetLastError());
      return false;
   }
   string responseText=CharArrayToString(response,0,WHOLE_ARRAY,CP_UTF8);
   if(StringFind(responseText,"retryable_database_error")>=0 ||\n      StringFind(responseText,"checksum_mismatch")>=0 ||\n      StringFind(responseText,"invalid_record")>=0 ||\n      StringFind(responseText,"invalid_identity")>=0)
   {
      Print("CS_PUBLISHER | server requested retry; cursor unchanged");
      return false;
   }
   PrintFormat("CS_PUBLISHER | acknowledged batch=%d through EventID=%s",n,(string)maxEventId);
   return SaveCursor(maxEventId);
}

void PollJournal()
{
   if(InpMentorBotToken=="" || StringFind(InpApiEndpoint,"YOUR-APP-DOMAIN")>=0) return;
   int h=FileOpen(InpJournalFile,FILE_READ|FILE_TXT|FILE_COMMON|FILE_SHARE_READ|FILE_SHARE_WRITE|FILE_ANSI);
   if(h==INVALID_HANDLE)
   {
      Print("CS_PUBLISHER | journal not available yet; waiting. error=",GetLastError());
      return;
   }

   string batch[];
   ArrayResize(batch,0);
   ulong maxAck=g_cursor;
   int scanned=0,invalid=0;
   while(!FileIsEnding(h))
   {
      string line=FileReadString(h);
      if(line=="") continue;
      string f[];
      int count=StringSplit(line,StringGetCharacter(";",0),f);
      for(int k=0;k<count;k++) f[k]=TrimQuotes(f[k]);
      if(count==18 && f[0]=="V3" && f[1]=="EVENT_ID") continue;
      // A partial final CSV row will not have all 18 fields or a valid checksum.
      // It is left unacknowledged and will be read again on the next poll.
      if(count!=18 || f[0]!="V3") { invalid++; continue; }
      ulong eventId=(ulong)StringToInteger(f[1]);
      if(eventId<=g_cursor) continue;
      if(eventId==0 || (uint)StringToInteger(f[17])!=JournalChecksum(f))
      {
         invalid++;
         // Never forward a checksum-invalid row. It is not used to create a signal.
         if(eventId>maxAck) maxAck=eventId;
         continue;
      }
      int eventType=(int)StringToInteger(f[7]);
      if(!IsPublishableType(eventType))
      {
         if(eventId>maxAck) maxAck=eventId;
         continue;
      }
      if(f[3]=="0" || f[4]=="" || (f[5]!="1" && f[5]!="-1") ||
         StringToInteger(f[14])<=0 || f[15]!="1" || f[8]=="" || f[9]=="")
      {
         invalid++;
         if(eventId>maxAck) maxAck=eventId;
         continue;
      }
      int n=ArraySize(batch);
      ArrayResize(batch,n+1);
      batch[n]=EventJSON(f,line);
      if(eventId>maxAck) maxAck=eventId;
      if(ArraySize(batch)>=MathMax(1,MathMin(100,InpBatchSize)))
      {
         FileClose(h);
         bool ok=SendBatch(batch,maxAck);
         if(!ok) return;
         ArrayResize(batch,0);
         h=FileOpen(InpJournalFile,FILE_READ|FILE_TXT|FILE_COMMON|FILE_SHARE_READ|FILE_SHARE_WRITE|FILE_ANSI);
         if(h==INVALID_HANDLE) return;
         // Continue scanning from the beginning; cursor filters acknowledged rows.
      }
   }
   FileClose(h);
   if(invalid>0) PrintFormat("CS_PUBLISHER | skipped invalid/partial journal rows=%d; journal not modified",invalid);
   if(ArraySize(batch)>0) SendBatch(batch,maxAck);
   else if(maxAck>g_cursor) SaveCursor(maxAck);
}

int OnInit()
{
   g_cursor_file="CS_SMC_PUBLISHER_"+IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN))+".cursor";
   LoadCursor();
   if(InpPollSeconds<1 || InpBatchSize<1 || InpBatchSize>100)
      return INIT_PARAMETERS_INCORRECT;
   EventSetTimer(InpPollSeconds);
   Print("CS_PUBLISHER | read-only journal publisher started; cursor=",g_cursor,
         " | no order functions are used");
   PollJournal();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   PollJournal();
}
