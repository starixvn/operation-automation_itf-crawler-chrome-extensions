const itfTennisServerUrl =
  "https://operationcrawlerapi.klc.nexdev.net/api/Tennis/itf-tennis";
const atpTourServerUrl =
  "https://operationcrawlerapi.klc.nexdev.net/api/Tennis/atp-tour";

// Initialize month and year dropdowns
function initializeDropdowns() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0-11
  const currentYear = currentDate.getFullYear();

  // Populate months
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  months.forEach((month, index) => {
    const $option = $("<option></option>");
    $option.val(index + 1); // 1-12
    $option.text(month);
    if (index === currentMonth) $option.prop("selected", true);
    $("#monthSelect").append($option);
  });

  // Populate years (current year and 2 years before/after)
  for (let year = currentYear - 2; year <= currentYear + 2; year++) {
    const $option = $("<option></option>");
    $option.val(year);
    $option.text(year);
    if (year === currentYear) $option.prop("selected", true);
    $("#yearSelect").append($option);
  }
}

function showStatus(message, isError = false) {
  $("#status").text(message);
  $("#status").show();
  $("#status").attr("class", isError ? "error" : "success");
}

function showAtpTourStatus(message, isError = false) {
  $("#atp-tour-status").text(message);
  $("#atp-tour-status").show();
  $("#atp-tour-status").attr("class", isError ? "error" : "success");
}

async function crawlTourData(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of selected month

  const dateFrom = startDate.toISOString().split("T")[0];
  const dateTo = endDate.toISOString().split("T")[0];

  // Fetch men's tournaments
  const menResponse = await fetch(
    `https://www.itftennis.com/tennis/api/TournamentApi/GetCalendar?circuitCode=MT&take=100&dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
  const menData = await menResponse.json();
  const menTours = menData.items;
  // Fetch women's tournaments
  const womenResponse = await fetch(
    `https://www.itftennis.com/tennis/api/TournamentApi/GetCalendar?circuitCode=WT&take=100&dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
  const womenData = await womenResponse.json();
  const womenTours = womenData.items;

  const allTours = [...menTours, ...womenTours];
  allTours.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  // filter allTours to only include tournaments that startDate <= today + 10 days and endDate >= today - 2 days
  const filteredTours = allTours.filter((tour) => {
    const startDate = new Date(tour.startDate);
    const endDate = new Date(tour.endDate);
    return (
      startDate <= new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) &&
      endDate >= new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    );
  });

  // Save to localStorage
  await chrome.storage.local.set({
    ItfTours: filteredTours,
  });

  // clear all local storage keys that start with ItfMatches-
  await clearPlayersAndMatchesFromLocalStorage(filteredTours);

  return filteredTours;
}

async function clearPlayersAndMatchesFromLocalStorage(tours) {
  // Lấy retainTournamentKeys = tất cả các tournamentKey trong tours
  const retainTournamentKeys = tours.map(tour => tour.tournamentKey);
  
  const allKeys = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(allKeys)
    .filter((key) => key.startsWith("ItfPlayers-") || key.startsWith("ItfMatches-"))
    .filter((key) => {
      const tourKey = key.replace("ItfPlayers-", "").replace("ItfMatches-", "");
      return !retainTournamentKeys.includes(tourKey);
    });
  await chrome.storage.local.remove(keysToRemove);
}

function renderTourBatches(tours, container) {
  // Clear previous results in the container
  $(container).empty();

  // Split tours into batches of 5
  const batchSize = 5;
  for (let i = 0; i < tours.length; i += batchSize) {
    const batch = tours.slice(i, i + batchSize);
    const $batchDiv = $('<div class="tour-batch"></div>');

    // Create table
    const $table = $('<table class="tour-table"></table>');

    // Add header
    const $thead = $(`
        <thead>
          <tr>
            <th style="width: 50px;"><input type="checkbox" checked='checked' class="batch-check-all"></th>
            <th>Tournament Name</th>
            <th>Host Nation</th>
            <th>City</th>
            <th>Dates</th>          
          </tr>
        </thead>
      `);
    $table.append($thead);

    // Add body
    const $tbody = $("<tbody></tbody>");
    batch.forEach((tour, index) => {
      const $tr = $(`
          <tr>
            <td><input type="checkbox" checked='checked' class="tour-checkbox" data-tour-key="${
              tour.tournamentKey
            }" data-tour-url="${tour.tournamentLink}"></td>
            <td>${tour.name}</td>
            <td>${tour.hostNation}</td>
            <td>${tour.venue || ""}</td>
            <td>${tour.dates}</td>          
          </tr>
        `);
      $tbody.append($tr);
    });
    $table.append($tbody);

    // Add controls
    const $controls = $(
      `<div class="tour-controls">
        <button class="crawl-matches-btn" type="button">Crawl Matches</button>
        <button class="crawl-players-btn" type="button">Crawl Players</button>
      </div>`
    );

    // Add event listener for header checkbox
    $batchDiv.on("change", ".batch-check-all", function () {
      const isChecked = $(this).prop("checked");
      $batchDiv.find(".tour-checkbox").prop("checked", isChecked);
    });

    // Add event listener for crawl button
    $batchDiv.on("click", ".crawl-matches-btn", async function () {
      const $button = $(this);
      const selectedTours = $batchDiv
        .find(".tour-checkbox:checked")
        .map(function () {
          return {
            key: $(this).data("tour-key"),
            url: $(this).data("tour-url"),
          };
        })
        .get();

      if (selectedTours.length > 0) {
        // Disable all crawl buttons and show loading state
        $(".crawl-matches-btn, #crawl-all-matches-btn").prop("disabled", true);
        $button.text("Crawling...");

        try {
          await crawlMatchesFromSelectedTours(selectedTours);
        } finally {
          // Re-enable all buttons and restore original text
          $(".crawl-matches-btn, #crawl-all-matches-btn").prop(
            "disabled",
            false
          );
          $button.text("Crawl Matches");
        }
      } else {
        showStatus("Please select at least one tournament", true);
      }
    });

    $batchDiv.on("click", ".crawl-players-btn", async function () {
      const $button = $(this);
      const selectedTours = $batchDiv
        .find(".tour-checkbox:checked")
        .map(function () {
          return {
            key: $(this).data("tour-key"),
            url: $(this).data("tour-url"),
          };
        })
        .get();

      if (selectedTours.length > 0) {
        // Disable all crawl buttons and show loading state
        $(".crawl-players-btn, #crawl-all-players-btn").prop("disabled", true);
        $button.text("Crawling...");

        try {
          await crawlPlayersForSelectedTours(selectedTours);
        } finally {
          // Re-enable all buttons and restore original text
          $(".crawl-players-btn, #crawl-all-players-btn").prop(
            "disabled",
            false
          );
          $button.text("Crawl Players");
        }
      } else {
        showStatus("Please select at least one tournament", true);
      }
    });

    // Assemble batch and add to container
    $batchDiv.append($table);
    $batchDiv.append($controls);
    $(container).append($batchDiv);
  }
}

async function crawlMatchesFromSelectedTours(tours) {
  try {
    showStatus("Crawling matches...");
    let index = 1;

    for (const tour of tours) {
      const matches = await crawlMatches(tour.key);
      showStatus(
        `Crawled matches for tournament ${index++} of ${tours.length}...`
      );
      if (matches) {
        // set localStorage key ItfMatches-{tour.key} to matches
        await chrome.storage.local.set({
          [`ItfMatches-${tour.key}`]: matches,
        });
      }
    }
    showStatus(
      `Successfully crawled matches from ${tours.length} tournaments!`
    );
  } catch (error) {
    showStatus("Error crawling matches: " + error.message, true);
    console.error("Error:", error);
  }
}

async function crawlPlayersForSelectedTours(tours) {
  try {
    showStatus("Crawling players...");
    let index = 1;

    for (const tour of tours) {
      const players = await crawlPlayers(tour.key);
      showStatus(
        `Crawled players for tournament ${index++} of ${tours.length}...`
      );
      if (players) {
        await chrome.storage.local.set({
          [`ItfPlayers-${tour.key}`]: players,
        });
      }
    }
    showStatus(
      `Successfully crawled players from ${tours.length} tournaments!`
    );
  } catch (error) {
    showStatus("Error crawling players: " + error.message, true);
    console.error("Error:", error);
  }
}

async function crawlMatches(key) {
  try {
    // Get order of play days
    const daysResponse = await fetch(
      `https://www.itftennis.com/tennis/api/TournamentApi/GetOrderOfPlayDays?tournamentKey=${key}`
    );
    const daysData = await daysResponse.json();

    // Check if array is empty
    if (!daysData || daysData.length === 0) {
      return null;
    }

    // Get first item
    const orderOfPlay = daysData[0];

    // Get matches data
    const matchesResponse = await fetch(
      `https://www.itftennis.com/tennis/api/TournamentApi/GetOrderOfPlay?orderOfPlayDayId=${orderOfPlay.orderOfPlayDayId}`
    );
    const matchJson = await matchesResponse.json();
    const matches = matchJson.flatMap((item) => item.matches);

    // remove unused properties and restructure players
    matches.forEach((match) => {
      const teams = match.teams;
      const homePlayers = teams[0].players;
      const awayPlayers = teams[1].players;
      match.homePlayers = homePlayers;
      match.awayPlayers = awayPlayers;
      match.tournamentKey = key;
      match.playDate = orderOfPlay.playDate;
      delete match.teams;
    });

    return matches;
  } catch (error) {
    console.error("Error crawling matches:", error);
    throw error;
  }
}

async function crawlPlayers(key) {
  const allPlayers = [];
  const eventFilters = await getEventFiltersData(key);
  const tournamentId = eventFilters.tournamentId;
  const tourType = eventFilters.tourType;
  for (const filter of eventFilters.filters) {
    const matchTypeCode = filter.valueCode;
    for (const subFilter of filter.subFilter) {
      const eventClassificationCode = subFilter.valueCode;
      const players = await crawPlayersFromDrawSheet(
        eventClassificationCode,
        matchTypeCode,
        tourType,
        tournamentId
      );
      allPlayers.push(...players);
    }
  }

  // distinct players by playerId
  const filteredPlayers = allPlayers.filter(
    (player, index, self) =>
      index === self.findIndex((t) => t.playerId === player.playerId)
  );

  return filteredPlayers;
}

async function getEventFiltersData(key) {
  const url = `https://www.itftennis.com/tennis/api/TournamentApi/GetEventFilters?tournamentKey=${key}`;
  const response = await fetch(url);
  const data = await response.json();

  return data;
}

async function crawPlayersFromDrawSheet(
  eventClassificationCode,
  matchTypeCode,
  tourType,
  tournamentId
) {
  const postData = {
    eventClassificationCode,
    matchTypeCode,
    tourType,
    tournamentId,
    weekNumber: 0,
  };
  const response = await fetch(
    "https://www.itftennis.com/tennis/api/TournamentApi/GetDrawsheet",
    {
      method: "POST",
      body: JSON.stringify(postData),
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const data = await response.json();

  // Extract all players from the data
  const players = extractPlayers(data);
  console.log("Extracted players:", players);

  return players;

  function extractPlayers(data) {
    const playersMap = new Map(); // Use Map to remove duplicates by playerId

    // Extract players from groups (works for both koGroups and rrGroups)
    const extractPlayersFromGroups = (groups) => {
      if (groups && Array.isArray(groups)) {
        for (const group of groups) {
          if (group.rounds && Array.isArray(group.rounds)) {
            for (const round of group.rounds) {
              if (round.matches && Array.isArray(round.matches)) {
                for (const match of round.matches) {
                  if (match.teams && Array.isArray(match.teams)) {
                    for (const team of match.teams) {
                      if (team.players && Array.isArray(team.players)) {
                        for (const player of team.players) {
                          // Filter out null players and add to map
                          if (player && player.playerId) {
                            playersMap.set(player.playerId, player);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    // Process both koGroups and rrGroups
    extractPlayersFromGroups(data.koGroups);
    extractPlayersFromGroups(data.rrGroups);

    // Convert Map values to array
    return Array.from(playersMap.values());
  }
}

async function getDataModel() {
  try {
    // Lấy tournaments từ localStorage với key ItfTours
    const result = await chrome.storage.local.get(["ItfTours"]);
    const tournaments = result.ItfTours || [];

    // Lặp qua hết các tournament và lấy matches tương ứng
    for (const tournament of tournaments) {
      const tournamentKey = tournament.tournamentKey;

      // Lấy matches của tournament bằng localStorage với key ItfMatches-tournamentKey
      const matchStorage = await chrome.storage.local.get([
        `ItfMatches-${tournamentKey}`,
      ]);
      const playerStorage = await chrome.storage.local.get([
        `ItfPlayers-${tournamentKey}`,
      ]);
      tournament.matches = matchStorage[`ItfMatches-${tournamentKey}`] || [];
      tournament.players = playerStorage[`ItfPlayers-${tournamentKey}`] || [];
    }

    return tournaments;
  } catch (error) {
    showStatus("Error getting data model: " + error.message, true);
    throw error;
  }
}

async function pushItfTennisMatchesToServer() {
  try {
    disableAllButtons();
    showStatus("Pushing matches to server...");
    const tournaments = await getDataModel();
    const response = await fetch(itfTennisServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tournaments),
    });

    if (!response.ok) {
      throw new Error("Failed to push matches");
    }

    showStatus("Successfully pushed matches to server!");
  } catch (error) {
    showStatus("Error pushing matches: " + error.message, true);
    console.error("Error:", error);
  } finally {
    enableAllButtons();
  }
}

async function pushAtpTourMatchesToServer() {
  try {
    disableAllButtons();
    showAtpTourStatus("Pushing atp tour matches to server...");
    const response = await fetch(atpTourServerUrl, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to push atp tour matches");
    }

    showAtpTourStatus("Successfully pushed atp tour matches to server!");
  } catch (error) {
    showAtpTourStatus("Error pushing atp tour matches: " + error.message, true);
    console.error("Error:", error);
  } finally {
    enableAllButtons();
  }
}

function disableAllButtons() {
  $("#crawlTour").prop("disabled", true);
  $(".crawl-matches-btn").prop("disabled", true);
  $("#crawl-all-matches-btn").prop("disabled", true);
  $("#push-all-itf-matches-btn").prop("disabled", true);
  $("#push-all-atp-matches-btn").prop("disabled", true);
}

function enableAllButtons() {
  $("#crawlTour").prop("disabled", false);
  $(".crawl-matches-btn").prop("disabled", false);
  $("#crawl-all-matches-btn").prop("disabled", false);
  $("#push-all-itf-matches-btn").prop("disabled", false);
  $("#push-all-atp-matches-btn").prop("disabled", false);
}

$(document).ready(function () {
  initializeDropdowns();

  // Add event listener for "Crawl All Matches" button
  $("#crawl-all-matches-btn").on("click", async function () {
    const $button = $(this);
    const allCheckboxes = $(".tour-checkbox");

    if (allCheckboxes.length === 0) {
      showStatus("No tournaments available to crawl", true);
      return;
    }

    const selectedTours = allCheckboxes
      .map(function () {
        return {
          key: $(this).data("tour-key"),
          url: $(this).data("tour-url"),
        };
      })
      .get();

    if (selectedTours.length > 0) {
      // Disable button and show loading state
      $button.prop("disabled", true).text("Crawling All...");
      $(".crawl-matches-btn").prop("disabled", true);

      try {
        await crawlMatchesFromSelectedTours(selectedTours);
      } finally {
        // Re-enable buttons and restore original text
        $button.prop("disabled", false).text("Crawl All Matches");
        $(".crawl-matches-btn").prop("disabled", false);
      }
    } else {
      showStatus("No tournaments available to crawl", true);
    }
  });

  $("#crawl-all-players-btn").on("click", async function () {
    const $button = $(this);
    const allCheckboxes = $(".tour-checkbox");

    if (allCheckboxes.length === 0) {
      showStatus("No tournaments available to crawl", true);
      return;
    }

    const selectedTours = allCheckboxes
      .map(function () {
        return {
          key: $(this).data("tour-key"),
          url: $(this).data("tour-url"),
        };
      })
      .get();

    if (selectedTours.length > 0) {
      // Disable button and show loading state
      $button.prop("disabled", true).text("Crawling All...");
      $(".crawl-players-btn").prop("disabled", true);

      try {
        await crawlPlayersForSelectedTours(selectedTours);
      } finally {
        // Re-enable buttons and restore original text
        $button.prop("disabled", false).text("Crawl All players");
        $(".crawl-players-btn").prop("disabled", false);
      }
    } else {
      showStatus("No tournaments available to crawl", true);
    }
  });

  $("#push-all-itf-matches-btn").on("click", async function () {
    pushItfTennisMatchesToServer();
  });

  $("#push-all-atp-matches-btn").on("click", async function () {
    pushAtpTourMatchesToServer();
  });

  $("#crawlTour").on("click", async () => {
    try {
      // Disable button and show loading state
      $("#crawlTour").prop("disabled", true).text("Crawling...");

      const selectedMonth = parseInt($("#monthSelect").val());
      const selectedYear = parseInt($("#yearSelect").val());

      showStatus("Crawling tournament data...");

      const tours = await crawlTourData(selectedMonth, selectedYear);

      showStatus(
        `Successfully crawled tournament data for ${selectedMonth} ${selectedYear}!`
      );

      // Show and render men's tournaments
      const $toursSection = $("#tours");
      if (tours && tours.length > 0) {
        $toursSection.show();
        renderTourBatches(tours, $toursSection[0]);
        $("#tourResults").show();
      } else {
        $toursSection.hide();
      }
    } catch (error) {
      showStatus("An error occurred: " + error.message, true);
      console.error("Error:", error);
    } finally {
      // Re-enable button and restore original text
      $("#crawlTour").prop("disabled", false).text("Crawl Tournaments");
    }
  });
});
