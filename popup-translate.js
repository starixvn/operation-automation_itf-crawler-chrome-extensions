function showStatus(sport, message, isError = false) {
  $item = $(`.${sport} div`);
  $item.text(message);
  $item.show();
  $item.attr("class", isError ? "error" : "success");
}

function disableAllButtons(rowClass) {
  $(`.${rowClass} button`).prop("disabled", true);
}

function enableAllButtons(rowClass) {
  $(`.${rowClass} button`).prop("disabled", false);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

$(document).ready(function () {

  $("#home-btn").on("click", function () {
    window.location.href = "popup.html";
  });

  $("#trigger-n8n-btn").on("click", async function () {
    try {
      disableAllButtons('trigger-n8n');
      showStatus('trigger-n8n', "Running... Please wait.");
      chrome.runtime.sendMessage(
        {
          action: 'triggerWebhook',
          url: 'https://n8n.nexdev.net/webhook/d0a29a84-df60-47c6-b129-971e57c0372a',
          body: {
            message: "Triggering translation webhook"
          }
        },
        (response) => {
          enableAllButtons('trigger-n8n');

          if (chrome.runtime.lastError) {
            console.error('Popup: Runtime error:', chrome.runtime.lastError);
            showStatus('trigger-n8n', 'Error: ' + chrome.runtime.lastError.message, true);
            return;
          }

          if (response && response.success) {
            console.log('Popup: Success:', response.data);
            showStatus('trigger-n8n', 'Webhook triggered successfully!');
          } else {
            console.error('Popup: Error:', response?.error);
            showStatus('trigger-n8n', 'Error: ' + (response?.error || 'Unknown error'), true);
          }
        }
      );
    } catch (err) {
      showStatus('trigger-n8n', "Error trigger translation webhook: " + err.message, true);
    } finally {
      enableAllButtons('trigger-n8n');
    }
  });
});