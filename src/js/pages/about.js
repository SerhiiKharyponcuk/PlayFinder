export function init() {
  for (const [buttonId, contentId] of [['storyToggle', 'storyContent'], ['valuesToggle', 'valuesContent']]) {
    const button = document.getElementById(buttonId);
    const content = document.getElementById(contentId);
    if (!button || !content) continue;
    button.setAttribute('aria-controls', contentId);
    button.setAttribute('aria-expanded', String(!content.hidden));
    button.addEventListener('click', () => {
      content.hidden = !content.hidden;
      button.setAttribute('aria-expanded', String(!content.hidden));
    });
  }
}
