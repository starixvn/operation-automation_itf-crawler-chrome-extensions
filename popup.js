document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('startCrawl');
  const exportButton = document.getElementById('exportCSV');
  const statusDiv = document.getElementById('status');

  let crawledData = [];

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.className = isError ? 'error' : 'success';
  }

  startButton.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('itftennis.com')) {
        showStatus('Please navigate to ITF Tennis website first!', true);
        return;
      }

      showStatus('Crawling data...');
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'startCrawl' });
      
      if (response.success) {
        crawledData = response.data;
        showStatus(`Successfully crawled ${crawledData.length} items!`);
        exportButton.disabled = false;
      } else {
        showStatus('Failed to crawl data!', true);
      }
    } catch (error) {
      showStatus('An error occurred: ' + error.message, true);
    }
  });

  exportButton.addEventListener('click', async () => {
    if (crawledData.length === 0) {
      showStatus('No data to export!', true);
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: 'exportCSV',
        data: crawledData
      });
      showStatus('Data exported successfully!');
    } catch (error) {
      showStatus('Failed to export data: ' + error.message, true);
    }
  });
});
