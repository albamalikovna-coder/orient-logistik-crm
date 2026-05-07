import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend('re_8KFBcfBo_QJ19u2bWXGxgwbRaXj8tpKyB');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body;

  try {
    const { data, error } = await resend.emails.send({
      from: 'OrientLogistik CRM <onboarding@resend.dev>', // Позже заменим на домен
      to,
      subject,
      html,
    });

    if (error) {
      return res.status(400).json(error);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
