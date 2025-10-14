// Open popup in a separate window when extension icon is clicked
let popupWindowId = null;

chrome.action.onClicked.addListener(() => {
  // Check if the popup window is already open
  if (popupWindowId !== null) {
    chrome.windows.get(popupWindowId, (window) => {
      if (chrome.runtime.lastError || !window) {
        // Window was closed, create a new one
        createPopupWindow();
      } else {
        // Window exists, focus it
        chrome.windows.update(popupWindowId, { focused: true });
      }
    });
  } else {
    createPopupWindow();
  }
});

function createPopupWindow() {
  chrome.windows.create({
    url: 'popup.html',
    type: 'popup',
    width: 1250,
    height: 800,
    focused: true
  }, (window) => {
    popupWindowId = window.id;
  });
}

// Listen for window close event to reset the window ID
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportCSV') {
    exportToCSV(request.data);
  }
});

function exportToCSV(data) {
  // Define the columns for the CSV file
  const columns = ['name', 'date', 'location', 'category', 'surface', 'prize'];
  
  // Create CSV content
  let csvContent = columns.join(',') + '\n';
  
  // Add data rows
  data.forEach(item => {
    const row = columns.map(column => {
      // Escape special characters and wrap in quotes
      const value = item[column] || '';
      return `"${value.replace(/"/g, '""')}"`;
    });
    csvContent += row.join(',') + '\n';
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  chrome.downloads.download({
    url: url,
    filename: `itf_tennis_data_${timestamp}.csv`,
    saveAs: true
  });
}
