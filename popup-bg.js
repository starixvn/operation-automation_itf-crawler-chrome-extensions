$(document).ready(function () {

  // Get All Sport Data button click handler
  $("#get-all-data-btn").click(function () {
    getBgData();
  });

  $("#get-job-status-btn").click(function () {
    getJobStatus();
  });

  $("#home-btn").on("click", function () {
    window.location.href = "popup.html";
  });
});

function showStatus(message, type = "info") {
  $("#status").text(message);
  $("#status").show();
  $("#status").attr("class", type);
}

async function getJobStatus() {
  try {
    $("button").prop("disabled", true);
    showStatus("Triggering Bet Genius API...", "info");
    // TODO: Replace with your API URL
    const apiUrl = "https://bg-download.klc.nexdev.net/";
    const response = await fetch(apiUrl, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      showStatus(await response.text(), "success");
    }
  } catch (error) {
    console.error("Error:", error);
    showStatus("Error: " + error.message, "error");
  } finally {
    $("button").prop("disabled", false);
  }
}


async function getBgData() {
  try {
    $("button").prop("disabled", true);
    showStatus("Triggering Bet Genius API...", "info");

    // TODO: Replace with your API URL
    const apiUrl = "https://bg-download.klc.nexdev.net/api/run/all";

    const response = await fetch(apiUrl, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      showStatus(await response.text(), "success");
    }
  } catch (error) {
    console.error("Error:", error);
    showStatus("Error: " + error.message, "error");
  } finally {
    $("button").prop("disabled", false);
  }
}
