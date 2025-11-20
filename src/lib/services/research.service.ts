import type { AgentRuntimeContext, TopicIdea } from '../types';

const TRENDS_ENDPOINT = 'https://newsapi.org/v2/everything';

const FALLBACK_TOPICS: TopicIdea[] = [
  {
    title: 'Robot surgeons now outperform humans in microsurgery tests',
    summary: 'Autonomous surgical robots completed 97% of microsuture tasks faster than leading surgeons.',
    angle: 'Highlight precision, speed, and what it means when robots master steady hands.',
    sources: [
      { title: 'MIT Technology Review', url: 'https://www.technologyreview.com/' },
      { title: 'Nature Robotics', url: 'https://www.nature.com/natmachintell/' },
    ],
  },
  {
    title: 'Quantum AI lab announces qubit leap that slashes training power',
    summary: 'Researchers combined quantum annealing with AI chips to cut energy costs by 37%.',
    angle: 'Focus on the sustainability angle and the idea of greener AGI.',
    sources: [
      { title: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/' },
      { title: 'Quantum Magazine', url: 'https://www.quantamagazine.org/' },
    ],
  },
  {
    title: 'Self-healing nanobots designed to patrol human bloodstream',
    summary: 'New nanobots repair themselves mid-mission, enabling continuous internal diagnostics.',
    angle: 'Lean into the sci-fi visual of nanobot patrols keeping us alive.',
    sources: [
      { title: 'Wired', url: 'https://www.wired.com/' },
      { title: 'Science Advances', url: 'https://www.science.org/journal/sciadv' },
    ],
  },
];

export async function generateTopicIdea(context: AgentRuntimeContext): Promise<TopicIdea> {
  const { config, logger } = context;
  const keywordQuery = encodeURIComponent(
    ['AI', 'artificial intelligence', 'robotics', 'quantum computing', 'future tech'].join(' OR '),
  );

  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    await logger('NEWS_API_KEY missing. Falling back to internal trending set.');
    return FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
  }

  const url = `${TRENDS_ENDPOINT}?q=${keywordQuery}&language=en&sortBy=publishedAt&pageSize=5`;
  try {
    const response = await fetch(url, {
      headers: { 'X-Api-Key': apiKey },
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) {
      throw new Error(`News API error ${response.status}`);
    }

    const data = (await response.json()) as {
      articles?: Array<{ title: string; description: string; url: string; source?: { name?: string } }>;
    };

    const articles = data.articles?.filter((article) => !!article.title) ?? [];
    if (articles.length === 0) {
      await logger('No trending topics returned. Using fallback list.');
      return FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
    }

    const primary = articles[0];
    const secondary = articles.slice(1, 4);

    const angle = `Deliver a futurist hype tone that fits the ${config.videoStyle} aesthetic. Highlight why this matters right now and give a forward-looking twist.`;

    return {
      title: primary.title ?? 'AI Breakthrough',
      summary: primary.description ?? 'Latest AI headline summarized.',
      angle,
      sources: [
        {
          title: primary.source?.name ?? 'Primary Source',
          url: primary.url,
        },
        ...secondary.map((article) => ({
          title: article.source?.name ?? 'Supporting Source',
          url: article.url,
        })),
      ],
    };
  } catch (error) {
    await logger('Trending research failed', { error: (error as Error).message });
    return FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
  }
}
