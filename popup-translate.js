function showStatus(sport, message, isError = false) {
  $item = $(`.${sport} .status-message`);
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
});