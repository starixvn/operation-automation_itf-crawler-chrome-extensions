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

$(document).ready(function () {

  $("#home-btn").on("click", function () {
    window.location.href = "popup.html";
  });
});
