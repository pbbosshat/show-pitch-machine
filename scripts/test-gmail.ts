import { getNewsletterMessages } from '../lib/gmail';

const since = new Date();
since.setDate(since.getDate() - 7);
console.log('Fetching Gmail messages since', since.toISOString());
getNewsletterMessages(since)
  .then(msgs => {
    console.log('Messages found:', msgs.length);
    msgs.slice(0, 3).forEach(m => console.log(' ', m.sender, '|', m.subject?.substring(0, 60)));
  })
  .catch((e: any) => console.error('FAILED:', e.message));
