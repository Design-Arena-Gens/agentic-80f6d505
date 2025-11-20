import type { AgentRuntimeContext, ScriptDraft, TopicIdea, UploadMetadata } from '../types';

const BASE_HASHTAGS = ['#AI', '#FutureTech', '#Innovation', '#TechNews', '#Shorts'];

export function buildUploadMetadata(
  context: AgentRuntimeContext,
  topic: TopicIdea,
  script: ScriptDraft,
): UploadMetadata {
  const { config } = context;
  const title = `${topic.title} 🚀 (${new Date().toLocaleDateString()})`;

  const descriptionLines = [
    `${config.channelName} — ${config.tagline}`,
    ``,
    `Hook: ${script.hook.replace(/\[[^\]]+]/g, '')}`,
    `Sources:`,
    ...topic.sources.map((source) => `• ${source.title}: ${source.url}`),
    ``,
    `#shorts ${[...new Set([...BASE_HASHTAGS, ...config.hashtags])].join(' ')}`,
  ];

  return {
    title,
    description: descriptionLines.join('\n'),
    hashtags: [...new Set([...BASE_HASHTAGS, ...config.hashtags])],
    keywords: [...new Set([...config.keywords, 'AI facts', 'robotics', 'quantum computing', 'future technology'])],
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}
