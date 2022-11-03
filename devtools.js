let interval = null;

const readableSize = (size) => {
  if (size === 0) return '0B';
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(2) * 1} ${['B', 'kB', 'MB', 'GB', 'TB'][i]}`;
};

const createTreeHTML = (folder, structure, container, relativePath, isRoot = false) => {
  console.log('relative', relativePath);
  Object.keys(folder).forEach(key => {
    if (Object.keys(folder[key]).length) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      if (isRoot) {
        details.open = true
        details.classList.add('root');
        summary.textContent = ' ';
      } else {
        summary.textContent = key;
      }
      details.append(summary)
      const div = document.createElement('div');
      details.append(div);
      container.append(details);
      createTreeHTML(folder[key], structure, div,  key !== '.' ? relativePath + '/' + key : relativePath)
    } else {
      const div = document.createElement('div');
      div.classList.add('file');
      div.tabIndex = 0;
      const filePath = relativePath + '/' + key;
      div.dataset.relativePath = filePath;
      const file = structure.find(element => {
        return element.relativePath === filePath
      });
      console.log('file', file, file.size, filePath);
      div.innerHTML = `${key} <span class="size">(${readableSize(file.size)})</span>`;
      container.append(div);
    }
  });
}

chrome.devtools.panels.create("OPFS Explorer", "icon.svg", "panel.html", panel => {
      panel.onShown.addListener( (extPanelWindow) => {
        const main = extPanelWindow.document.body.querySelector('main');
        let lastLength = 0;

        const refreshTree = () => {
                chrome.tabs.sendMessage(
                  chrome.devtools.inspectedWindow.tabId,
                  "getDirectoryStructure",
                (response) => {
                  const structure = {};
                  response.structure.forEach(file => {
                    file.relativePath.split('/').reduce((previous,current)=> (previous[current] = previous[current] || {}), structure)
                  });
                  console.log(structure)
                  const div = document.createElement('div');
                  createTreeHTML(structure, response.structure, div, '.', true)
                  if (div.textContent.length !== lastLength) {
                    main.innerHTML = '';
                    main.append(div);
                    lastLength = div.textContent.length;
                  }
                });
        }

        refreshTree();
        interval = setInterval(refreshTree, 3000);
      });

      panel.onHidden.addListener(() => {
        clearInterval(interval);
      });
});

// Create a connection to the background service worker
const backgroundPageConnection = chrome.runtime.connect({
    name: "devtools-page"
});

// Relay the tab ID to the background service worker
backgroundPageConnection.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
});