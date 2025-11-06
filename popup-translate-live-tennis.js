//const liveTennisServerUrl = "https://ops-api.nexdev.net/api/Tennis/live-tennis";
const liveTennisServerUrl = "http://localhost:5000/api/Tennis/live-tennis";



$(document).ready(function () {
  // Add event listener for "Crawl All Matches" button
  $("#tennis-crawl-btn").on("click", async function () {
    try {
      disableAllButtons('tennis');
      const token = await getCsrfToken();
      const players = await queryAllData(token);

      await chrome.storage.local.set({
        LiveTennisPlayers: players,
      });
      pushLiveTennisDataToServer();
      showStatus('tennis',
        `Successfully queried all data. Total players: ${players.length}`
      );
    } catch (err) {
      showStatus('tennis', "Error query data: " + err.message, true);
    } finally {
      enableAllButtons('tennis');
    }
  });

  $("#tennis-push-btn").on("click", async function () {
    try {
      disableAllButtons('tennis');
      await pushLiveTennisDataToServer();
    } catch (err) {
      showStatus('tennis', "Error push data: " + err.message, true);
    } finally {
      enableAllButtons('tennis');
    }
  });

  async function getCsrfToken() {
    const url = `https://www.live-tennis.cn/en/rank/atp/s/year`;
    const response = await fetch(url);
    const htmlString = await response.text();
    const parser = new DOMParser();

    const doc = parser.parseFromString(htmlString, "text/html");
    const metaTag = doc.querySelector('meta[name="csrf-token"]');

    return metaTag ? metaTag.getAttribute("content") : "";
  }

  async function queryAllData(token) {
    const urls = ["https://www.live-tennis.cn/zh/rank/atp/s/year/query",
      "https://www.live-tennis.cn/zh/rank/wta/s/year/query",
      "https://www.live-tennis.cn/zh/rank/atp/s/race/query",
      "https://www.live-tennis.cn/zh/rank/atp/d/year/query",
      "https://www.live-tennis.cn/zh/rank/wta/d/year/query",
      "https://www.live-tennis.cn/zh/rank/atp/d/race/query",
      "https://www.live-tennis.cn/zh/rank/atp/s/nextgen/query"];

    let allPlayers = [];

    for (const url of urls) {
      const players = await queryAllPages(url, token);
      allPlayers = allPlayers.concat(players);
    }


    return distinctPlayers(allPlayers);
  }

  async function queryAllPages(url, token) {
    const originalUrl = url.replace("/query", "");
    const maxPage = 50;
    let recordTotal = 1000 * 1000;
    let recordCount = 0;
    let currentPage = 0;
    let allPlayers = [];
    while (recordCount < recordTotal && currentPage < maxPage) {
      const response = await queryPage(url, token, recordCount);
      let players = [];
      if (url.includes("/rank/atp/d/race")) {
        players = response.data.map(item => parseDoublePlayer(item, originalUrl)).flat();
      }
      else {
        players = response.data.map(item => parseSinglePlayer(item, originalUrl));
      }

      players = distinctPlayers(players);
      allPlayers = allPlayers.concat(players);
      currentPage++;
      recordCount += response.data.length;
      recordTotal = response.recordsTotal;
      showStatus('tennis', `Queried ${recordCount} of ${recordTotal} rows of ${originalUrl}`);
    }

    return distinctPlayers(allPlayers);
  }

  async function queryPage(url, token, start) {

    const data = getQueryParams(start);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-csrf-token": token,
      },
      // body là chuỗi đã được mã hóa từ URLSearchParams
      body: data.toString(),
    });

    return response.json();
  }

  function distinctPlayers(players) {
    const playerMap = new Map();
    players.forEach((player) => {
      if (!playerMap.has(player.id)) {
        playerMap.set(player.id, player);
      }
    });
    return Array.from(playerMap.values());
  }

  function parseSinglePlayer(item, originalUrl) {
    const chinese_name = standardizePlayerName(item.full_name);
    return {
      id: item.id,
      url: originalUrl,
      name: item.engname,
      chinese_name: chinese_name,
      country: item.ioc,
    };
  }


  function parseDoublePlayer(item, originalUrl) {
    const chinese_name = standardizePlayerName(item.full_name);
    const player1 = {
      id: item.id.split("/")[0].trim(),
      url: originalUrl,
      name: item.engname.split("/")[0].trim(),
      chinese_name: chinese_name.split("/")[0].trim(),
      country: item.ioc.split("/")[0].trim(),
    };

    const player2 = {
      id: item.id.split("/")[1].trim(),
      url: originalUrl,
      name: item.engname.split("/")[1].trim(),
      chinese_name: chinese_name.split("/")[1].trim(),
      country: item.ioc.split("/")[1].trim(),
    };

    return [player1, player2];
  }

  function standardizePlayerName(name) {
    let cleanedText = name.replace(/<img\b[^>]*>/gi, '');
    cleanedText = cleanedText.replace(/<br\s*\/?>/gi, '/');
    return cleanedText.trim();
  }

  async function pushLiveTennisDataToServer() {
    try {
      disableAllButtons('tennis');
      showStatus('tennis', "Pushing data to server...");
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

      showStatus('tennis', "Successfully pushed data to server!");
    } catch (error) {
      showStatus('tennis', "Error pushing matches: " + error.message, true);
      console.error("Error:", error);
    } finally {
      enableAllButtons('tennis');
    }
  }
});
