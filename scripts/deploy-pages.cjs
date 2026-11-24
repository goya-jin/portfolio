// Use the ID returned by the upload step, avoiding a second artifact-list service.
async function deployPagesOnce({github, context, core, artifactId, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 120}) {
  if (!/^\d+$/.test(String(artifactId || ''))) throw Error('Missing uploaded Pages artifact ID');
  const params = {...context.repo};
  const token = await core.getIDToken();
  core.setSecret(token);
  const {data: deployment} = await github.request('POST /repos/{owner}/{repo}/pages/deployments', {
    ...params, artifact_id: Number(artifactId), pages_build_version: context.sha, oidc_token: token,
  });
  const deploymentId = deployment.id || deployment.status_url?.split('/').pop() || context.sha;
  core.info(`Created Pages deployment ${deploymentId}`);
  const failed = new Set(['deployment_failed','deployment_perms_error','deployment_content_failed','deployment_cancelled','deployment_lost']);
  let errors = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    await delay(5000);
    let state;
    try {
      state = (await github.request('GET /repos/{owner}/{repo}/pages/deployments/{deploymentId}', {...params, deploymentId})).data;
      errors = 0;
    } catch (error) {
      if (![404,429,500,502,503,504].includes(error.status) || ++errors >= 10) throw error;
      core.warning('Pages status is temporarily unavailable; retrying.');
      continue;
    }
    if (state.status === 'succeed') {
      core.setOutput('page_url', deployment.page_url);
      core.setOutput('status', 'succeed');
      return;
    }
    if (failed.has(state.status)) throw Object.assign(Error(`Pages deployment failed: ${state.status}`), {code:state.status==='deployment_failed'?'PAGES_TRANSIENT_FAILURE':'PAGES_FINAL_FAILURE'});
    core.info(`Pages deployment: ${state.status}`);
  }
  throw Error(`Pages deployment ${deploymentId} did not finish within 10 minutes`);
};

// Only retry after GitHub has explicitly marked the prior deployment failed.
module.exports = async function deployPages(options) {
  for (let attempt=0;attempt<3;attempt++) {
    try { return await deployPagesOnce(options); }
    catch(error) {
      if(error.code!=='PAGES_TRANSIENT_FAILURE'||attempt===2)throw error;
      options.core.warning('GitHub Pages reported a failed deployment; retrying the same uploaded artifact.');
      await (options.delay|| (ms=>new Promise(resolve=>setTimeout(resolve,ms))))(10000);
    }
  }
};
