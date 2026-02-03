import fs from 'fs';

try {
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  // Match version header: ## [0.13.0] - 2026-02-03
  const versionRegex = /^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}/m;
  const match = changelog.match(versionRegex);

  if (!match) {
    console.error('Could not find latest version in CHANGELOG.md');
    process.exit(1);
  }

  const version = match[1];
  console.info(`VERSION=${version}`);

  // Extract body: content after the match until the next "## [" or end of file
  if (match.index !== undefined) {
    const startIndex = match.index + match[0].length;
    const remainingText = changelog.substring(startIndex);
    const nextHeaderIndex = remainingText.search(/^## \[/m);

    let body = nextHeaderIndex !== -1 ? remainingText.substring(0, nextHeaderIndex) : remainingText;
    body = body.trim();

    fs.writeFileSync('RELEASE_BODY.md', body);
    console.info('Release body written to RELEASE_BODY.md');
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
