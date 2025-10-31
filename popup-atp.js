const atpTourServerUrl =
  "https://ops-api.nexdev.net/api/Tennis/atp-tour";

function showStatus(message, isError = false) {
  $("#status").text(message);
  $("#status").show();
  $("#status").attr("class", isError ? "error" : "success");
}

function disableAllButtons() {  
  $("button").prop("disabled", true);
}

function enableAllButtons() {  
  $("button").prop("disabled", false);
}

async function pushAllDataToServer() {
  try {
    disableAllButtons();
    showStatus("Pushing atp tour matches to server...");
    const response = await fetch(atpTourServerUrl, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to push atp tour matches");
    }

    showStatus("Successfully pushed atp tour matches to server!");
  } catch (error) {
    showStatus("Error pushing atp tour matches: " + error.message, true);
    console.error("Error:", error);
  } finally {
    enableAllButtons();
  }
}

$(document).ready(function () {
  
  $("#push-all-data-btn").on("click", async function () {
    pushAllDataToServer();
  });

  $("#home-btn").on("click", function () {
    window.location.href = "popup.html";
  });

});
