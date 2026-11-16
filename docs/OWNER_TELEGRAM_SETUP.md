# Owner Telegram notifications for Miami Elio

The main site's outbox delivers business events to one private Telegram chat. The scheduled Worker separately reads hourly Cloudflare Web Analytics for `gorgona-one.com`. It saves only the hour and the aggregate counts after filtering recognized bots. Visits are Cloudflare's estimate. Empty hours are recorded silently. Failures remain visible in the Worker logs and are retried at the next scheduled minute of `:15, :25, :35, :45, :55`.

## Pair the private chat

Use the dedicated @MIAElioBot token. Revoke a token exposed in chat through @BotFather before pairing. Do not paste the replacement into chat, command text, repository files, or shell history.

For a newly paired bot, open Windows PowerShell, run the first three lines below, and open the generated link in your Telegram account. Press **Start** in that private chat. Keep the terminal open for the second block.

```powershell
$pairCode = [guid]::NewGuid().ToString('N')
$botName = 'MIAElioBot'
Write-Output "https://t.me/${botName}?start=$pairCode"
```

```powershell
$pairSecret = Read-Host 'Replacement bot token' -AsSecureString
try {
    $pairToken = [Net.NetworkCredential]::new('', $pairSecret).Password
    $pairUpdates = Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$pairToken/getUpdates" -ErrorAction Stop
    $pairChat = @($pairUpdates.result | Where-Object {
        $_.message.chat.type -eq 'private' -and $_.message.text -ceq "/start $pairCode"
    } | ForEach-Object { $_.message.chat.id } | Select-Object -Unique)
    if ($pairChat.Count -ne 1) { throw 'Private chat pairing was not confirmed' }
    Write-Output $pairChat[0]
} catch {
    Write-Warning 'Pairing failed. Check Start, the current token, and whether the bot has an existing webhook.'
} finally {
    Remove-Variable pairSecret, pairToken, pairUpdates, pairChat -ErrorAction SilentlyContinue
}
```

Enter the replacement token and paired chat ID as `TELEGRAM_BOT_TOKEN` and `TELEGRAM_OWNER_CHAT_ID` in the **production site Worker** `gorgonaoneai3072126` under Runtime variables and secrets after the database guard is deployed. The scheduler only needs its existing job URL and bearer token.

## Staging and production cutover

1. Follow [controlled database releases](CONTROLLED_DATABASE_RELEASE.md). Verify exact main, active site Worker, target Supabase project, backup, and migration hash. In staging apply `20261116210000_owner_telegram_traffic.sql` and verify both settings default to NULL. Run dashboard tests and the Next and Cloudflare builds before releasing. The migration is backward compatible with the existing dispatcher and intentionally holds Telegram claims until enabled.
2. Use Telegram provider fixtures on the restricted dashboard staging Worker. Verify booking replay, a status update, a plan with several items, registration, and listing changes through the supported application paths. Check the active production versions of `dashboard_submit`, `dashboard_command`, and `dashboard_submit_plan` for equivalent writes to `private.notification_events`. A plan generates one alert.
3. Apply the reviewed migration to production with both settings NULL. Deploy the site and the updated `miami-elio-notifications` Worker. Check that the normal scheduled endpoint still works and that the traffic endpoint rejects an unauthenticated request before configuring credentials.
4. Add Telegram secrets after pairing. Identify and pause any invocation of Supabase Edge Function `miami-elio-telegram-dispatch`; check that its existing delivery leases have finished. Use the following reviewed transaction only for the production cutover. It preserves both queues' existing records and denies new legacy claims at the database boundary.

```sql
begin;
alter table public.bookings disable trigger telegram_booking_queue_trigger;
alter table public.request_events disable trigger telegram_request_queue_trigger;
revoke execute on function public.telegram_claim_notifications(integer) from service_role;
update private.owner_notification_settings set telegram_from=clock_timestamp() where singleton;
commit;
```

5. Verify one explicitly marked test event in the owner's chat. Record the provider message ID, receipt in the chat, latency, and queue counts before and after. Look for an older claim or a legacy send. Distinguish provider acceptance from a message seen in the receiving chat.

## Turn on the hourly summary

1. Create a Cloudflare Analytics read token scoped to the owning account. Configure `CLOUDFLARE_WEB_ANALYTICS_API_TOKEN` as a runtime secret and `CLOUDFLARE_WEB_ANALYTICS_ACCOUNT_ID` and `CLOUDFLARE_WEB_ANALYTICS_SITE_ID` as runtime variables on the site Worker. Use the Web Analytics property ID for the site. Compare the bot-filtered GraphQL result to the same property and completed hour in Web Analytics before enabling.
2. Start from the next complete collection hour with the reviewed statement below. Check the first nonempty summary and verify one send for the UTC hour, with the displayed interval in Miami time. Hours before the cutoff do not generate summaries.

```sql
update private.owner_notification_settings
  set traffic_from=date_trunc('hour',now(),'UTC')+interval '1 hour' where singleton;
```

If the Cloudflare API is unavailable throughout the retry window, the hour is skipped and the failed invocations remain visible in Workers Logs. Telegram's ambiguous send result is recorded as `traffic_outcome_unknown` for hourly summaries. Check the chat before attempting any manual replay.

## Stop delivery

Set `traffic_from=NULL` to stop traffic generation and claims for pending summaries. Set `telegram_from=NULL` to stop all new Telegram claims. Re-enabling uses a new cutoff. A delivery already claimed can still reach Telegram. Keep the legacy claims and triggers paused during ordinary rollback. Enable them only as part of an explicitly reviewed handback with independent backlog protection.
