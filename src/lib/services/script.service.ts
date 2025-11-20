import type { AgentRuntimeContext, ScriptDraft, TopicIdea } from '../types';

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

interface OpenAIChatResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

export async function craftScript(context: AgentRuntimeContext, topic: TopicIdea): Promise<ScriptDraft> {
  const { config, logger } = context;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY missing. Unable to craft script.');
  }

  const prompt = [
    `You are a viral short-form scriptwriter for a futuristic tech channel called ${config.channelName}.`,
    `Tone: ${config.tone}. Visual style: ${config.videoStyle}.`,
    'Write a script under 40 words (~15 seconds) with a hook in the first 2 seconds.',
    'Structure: HOOK in caps, 2 rapid-fire fact lines, final kicker question.',
    'Avoid filler. Each sentence <= 11 words. Include stage directions in [brackets] for visuals or SFX.',
    `Topic headline: ${topic.title}`,
    `Angle: ${topic.angle}`,
    `Sources summary: ${topic.summary}`,
    'Return JSON with keys hook, body, outro, estimatedDurationSeconds.',
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You create ultra-engaging AI short-form scripts.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    await logger('Script generation failed', { text });
    throw new Error(`OpenAI script generation failed: ${response.status}`);
  }

  const body = (await response.json()) as OpenAIChatResponse;
  const raw = body.choices[0]?.message.content ?? '{}';
  const payload = JSON.parse(raw) as {
    hook: string;
    body: string;
    outro: string;
    estimatedDurationSeconds: number;
  };

  const draft: ScriptDraft = {
    hook: payload.hook ?? 'THE FUTURE IS HERE.',
    body: payload.body ?? 'AI is evolving faster than hype. [Visual: data torrent]',
    outro: payload.outro ?? 'Ready for the upgrade?',
    estimatedDurationSeconds: payload.estimatedDurationSeconds ?? 15,
    fullScript: [payload.hook, payload.body, payload.outro].join(' '),
  };

  await logger('Script crafted', { draft });
  return draft;
}
