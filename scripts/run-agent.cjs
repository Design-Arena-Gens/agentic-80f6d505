require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    esModuleInterop: true,
    resolveJsonModule: true,
  },
});

const { executeDailyRun } = require('../src/lib/pipeline/agent');

async function main() {
  try {
    const result = await executeDailyRun();
    console.log(JSON.stringify({ ok: true, runId: result.id, status: result.status }, null, 2));
    process.exit(result.status === 'success' ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

main();
