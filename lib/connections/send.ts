// Outbound email for the Connect action, sent as Shawn (sm@gototeam.com) via a
// minted service-account token (domain-wide delegation) and a RAW Gmail REST
// call with Connection: close (consistent with dedup; avoids the SDK premature
// close).
//
// NOTE: gmail.send for this client is NOT yet granted (verified live 2026-08-10).
// mintGoogleAccessToken will throw the exact Google error (unauthorized_client)
// for the gmail.send scope until PB adds it to the DWD grant. That is intentional
// for Phase 1/2: the connect route catches the error and marks the row failed
// with the exact reason, never a silent success. Once the scope is granted this
// starts working with no code change.

import { mintGoogleAccessToken, SHAWN_MAILBOX } from './google';

const GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';

export async function sendConnectEmail(to: string, subject: string, body: string): Promise<void> {
  const token = await mintGoogleAccessToken([GMAIL_SEND], SHAWN_MAILBOX);

  // Plain text: Shawn's voice is plain, not HTML marketing.
  const raw = Buffer.from(
    `From: Shawn Moffatt <${SHAWN_MAILBOX}>\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `\r\n` +
      body
  ).toString('base64url');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Connection: 'close' },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail send ${res.status}: ${(await res.text()).slice(0, 240)}`);
}
