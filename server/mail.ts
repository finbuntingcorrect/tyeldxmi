export type MailResult = 'sent' | 'unconfigured' | 'failed';

export async function sendMagicLink(email: string, url: string): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 'unconfigured';
  const from = process.env.EMAIL_FROM || 'Today Cat <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Вход в Today Cat',
      text: `Откройте ссылку, чтобы войти в Today Cat. Она действует 30 минут и только один раз.\n\n${url}\n\nЕсли вы не просили ссылку, это письмо можно не открывать.`,
    }),
  });
  return response.ok ? 'sent' : 'failed';
}
