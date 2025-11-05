$(document).ready(function () {
  // Initialize page
  console.log("BG Page initialized");

  // Get All Sport Data button click handler
  $("#get-other-sport-data-btn").click(function () {
    getOtherSportData();
  });

  $("#get-soccer-sport-data-btn").click(function () {
    getSoccerSportData();
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

async function getOtherSportData() {
  try {
    $("#get-other-sport-data-btn").prop("disabled", true);
    showStatus("Triggering Bet Genius API...", "info");

    // TODO: Replace with your API URL
    const apiUrl = "https://ops-api.nexdev.net/api/bg/bg-other-sports";
    
    const response = await fetch(apiUrl, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
    showStatus("Trigger Successfully", "success");
    }
  } catch (error) {
    console.error("Error:", error);
    showStatus("Error: " + error.message, "error");
  } finally {
    $("#get-other-sport-data-btn").prop("disabled", false);
  }
}


async function getSoccerSportData() {
  try {
    $("#get-soccer-sport-data-btn").prop("disabled", true);
    showStatus("Triggering Bet Genius API...", "info");

    // TODO: Replace with your API URL
    const apiUrl = "https://ops-api.nexdev.net/api/bg/bg-soccer";
    
    const response = await fetch(apiUrl, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
    showStatus("Trigger Successfully", "success");
    }
  } catch (error) {
    console.error("Error:", error);
    showStatus("Error: " + error.message, "error");
  } finally {
    $("#get-soccer-sport-data-btn").prop("disabled", false);
  }
}
