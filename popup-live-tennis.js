const liveTennisServerUrl = "https://ops-api.nexdev.net/api/Tennis/live-tennis";
// const liveTennisServerUrl = "http://localhost:5000/api/Tennis/live-tennis";

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

async function getCsrfToken() {
  const url = `https://www.live-tennis.cn/en/rank/atp/s/year`;
  const response = await fetch(url);
  const htmlString = await response.text();
  const parser = new DOMParser();

  const doc = parser.parseFromString(htmlString, "text/html");
  const metaTag = doc.querySelector('meta[name="csrf-token"]');

  return metaTag ? metaTag.getAttribute("content") : "";
}

async function queryAllData(token, language) {
  let recordTotal = 1000 * 1000;
  let recordCount = 0;
  let currentPage = 0;
  allPlayers = [];

  while (recordCount < recordTotal && currentPage < 1) {
    const data = await queryData(token, language, recordCount);
    players = data.data.map((item) => {
      let full_name = item.full_name;      
      let translatedName = full_name.substr(full_name.indexOf('>')+1).trim();

      return {
        id: item.id,
        full_name: item.full_name,
        name: item.name,
        engname: item.engname,
        translated_name: translatedName,
        nation: item.nation,
        ioc: item.ioc,
      };
    });
    allPlayers = allPlayers.concat(players);
    currentPage++;
    recordCount += data.data.length;
    recordTotal = data.recordsTotal;
    showStatus(`Queried ${recordCount} of ${recordTotal} rows`);
  }

  return allPlayers;
}

async function queryData(token, language, start) {
  const url = `https://www.live-tennis.cn/${language}/rank/atp/s/year/query`;
  const data = getQueryParams(start);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      // Header này là bắt buộc cho dữ liệu dạng x-www-form-urlencoded
      "Content-Type": "application/x-www-form-urlencoded",
      "x-csrf-token": token,
    },
    // body là chuỗi đã được mã hóa từ URLSearchParams
    body: data.toString(),
  });

  return response.json();
}

function mergePlayers(enPlayers, zhPlayers, jaPlayers) {
  const enPlayerMap = new Map();
  const zhPlayerMap = new Map();
  const jaPlayerMap = new Map();

  zhPlayers.forEach((player) => {
    zhPlayerMap.set(player.id, player);
  });
  enPlayers.forEach((player) => {
    enPlayerMap.set(player.id, player);
  });
  jaPlayers.forEach((player) => {
    jaPlayerMap.set(player.id, player);
  });
  const mergedPlayers = [];

  enPlayerMap.forEach((enPlayer, id) => {
    const zhPlayer = zhPlayerMap.get(id);
    const jaPlayer = jaPlayerMap.get(id);

    player = {
      id: enPlayer.id,
      ioc: enPlayer.ioc,
      name: enPlayer.name,      
      en_nation: enPlayer.nation,
      zh_nation: zhPlayer ? zhPlayer.nation : "",
      ja_nation: jaPlayer ? jaPlayer.nation : "",
      en_full_name: enPlayer.full_name,
      zh_full_name: zhPlayer ? zhPlayer.full_name : "",
      ja_full_name: jaPlayer ? jaPlayer.full_name : "",
      en_name: enPlayer.translated_name,
      zh_name: zhPlayer ? zhPlayer.translated_name : "",
      ja_name: jaPlayer ? jaPlayer.translated_name : "",
    };
    mergedPlayers.push(player);
  });

  return mergedPlayers;
}


async function pushLiveTennisDataToServer() {
  try {
    disableAllButtons();
    showStatus("Pushing data to server...");
    const result = await chrome.storage.local.get(["LiveTennisPlayers"]);
    const players = result.LiveTennisPlayers || [];


    const response = await fetch(liveTennisServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(players),
    });

    if (!response.ok) {
      throw new Error("Failed to push matches");
    }

    showStatus("Successfully pushed data to server!");
  } catch (error) {
    showStatus("Error pushing matches: " + error.message, true);
    console.error("Error:", error);
  } finally {
    enableAllButtons();
  }
}

$(document).ready(function () {
  // Add event listener for "Crawl All Matches" button
  $("#crawl-all-data-btn").on("click", async function () {
    try {
      disableAllButtons();
      const token = await getCsrfToken();
      let allEnPlayers = await queryAllData(token, "en");
      let allZhPlayers = await queryAllData(token, "zh");
      let allJaPlayers = await queryAllData(token, "ja");
      allPlayers = mergePlayers(allEnPlayers, allZhPlayers, allJaPlayers);

      await chrome.storage.local.set({
        LiveTennisPlayers: allPlayers,
      });

      showStatus(
        `Successfully queried all data. Total players: ${allPlayers.length}`
      );
    } catch (err) {
      showStatus("Error query data: " + err.message, true);
    } finally {
      enableAllButtons();
    }
  });

  $("#push-all-data-btn").on("click", async function () {
    pushLiveTennisDataToServer();
  });

  $("#home-btn").on("click", function () {
    window.location.href = "popup.html";
  });
});
