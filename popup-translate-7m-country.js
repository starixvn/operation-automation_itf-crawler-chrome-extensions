//const liveTennisServerUrl = "https://ops-api.nexdev.net/api/Tennis/live-tennis";
const soccer7mServerUrl = "http://localhost:5000/api/Tennis/7m-soccer";



$(document).ready(function () {
  const MAX_PLAYERS = 1 * 1000;
  const MIN_PLAYER_ID = 1;
  const metadataKeyCache = new Map();
  let playerIdsFromStorage = new Set();

  $("#crawl-7m-btn").on("click", async function () {
    try {
      disableAllButtons();
      const playersFromStorage = await getPlayersFromStorage();
      const playerIds = playersFromStorage.map(player => player.id);
      playerIdsFromStorage = new Set(playerIds);
      const players = await queryAllPlayers();
      await chrome.storage.local.set({
        Soccer7m: players,
      });
      pushLiveTennisDataToServer();
      showStatus(
        `Successfully queried all data. Total players: ${players.length}`
      );
    } catch (err) {
      showStatus("Error query data: " + err.message, true);
    } finally {
      enableAllButtons();
    }
  });

  $("#push-tennis-btn").on("click", async function () {
    try {
      disableAllButtons();
      await pushLiveTennisDataToServer();
    } catch (err) {
      showStatus("Error push data: " + err.message, true);
    } finally {
      enableAllButtons();
    }
  });

  async function queryAllPlayers() {
    const players_gb = await queryAllPlayersByLanguage('gb');
    const players = await queryAllPlayersByLanguage('big');

    return joinPlayersById(players_gb, players);
  }

  async function queryAllPlayersByLanguage(language) {
    const players = [];
    for (let i = MIN_PLAYER_ID; i <= MAX_PLAYERS; i++) {
      if (playerIdsFromStorage.has(i)) {
        continue;
      }

      const player = await queryPlayer(i, language);
      if (player) {
        players.push(player);
      }
      else {
        break;
      }
      showStatus(`Queried ${players.length} of ${MAX_PLAYERS} players. Language: ${language}. Current index: ${i}`);
    }

    return players;
  }

  async function queryPlayer(id, language) {
    const url = language === 'big'
      ? `https://team.7m.com.cn/${id}/index.shtml`
      : `https://team.7m.com.cn/${id}/index_gb.shtml`;

    const response = await fetch(url);
    const htmlString = await response.text();
    const infoUrl = getInfoUrl(htmlString);
    if (!infoUrl) {
      return null;
    }

    const languageCode = getLanguage(htmlString);
    if (!languageCode) {
      return null;
    }

    const infoResponse = await fetch(infoUrl);
    const infoText = await infoResponse.text();
    const infoJson = infoText.replaceAll('var teamInfo = ', '').replaceAll(';', '');
    const teamInfo = JSON.parse(infoJson);

    const eIndex = teamInfo["e_index"];
    const { chinese_key, english_key, country_key } = await queryMetadataKey(eIndex, languageCode);
    if (!chinese_key || !english_key || !country_key) {
      return null;
    }

    const chinese_name = teamInfo[chinese_key];
    const english_name = teamInfo[english_key];
    const country = teamInfo[country_key];

    return { id, chinese_name, english_name, country };
  }
  async function queryMetadataKey(eIndex, languageCode) {
    const metaUrl = `https://team.7m.com.cn/v2/encrypt/fun/getinfofun.php?eindex=${eIndex}&lang=${languageCode}`;
    if (metadataKeyCache.has(metaUrl)) {
      return metadataKeyCache.get(metaUrl);
    }

    const response = await fetch(metaUrl);
    const metaText = await response.text();
    const metaLines = getSpecificLines(metaText, [13, 15, 38]);
    const chinese_key = extractQuotedString(metaLines[13]);
    const english_key = extractQuotedString(metaLines[15]);
    const country_key = extractQuotedString(metaLines[38]);
    metadataKeyCache.set(metaUrl, { chinese_key, english_key, country_key });
    return { chinese_key, english_key, country_key };
  }

  function getInfoUrl(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const scriptTag = doc.querySelector('script[src*="/v2/encrypt/fun/getinfo.php"]');

    return scriptTag ? `https://team.7m.com.cn${scriptTag.getAttribute('src')}` : null;
  }

  function getLanguage(inputString) {
    const regex = /var lang\s*=\s*"(.*?)";?/;

    const match = inputString.match(regex);

    return match && match.length > 1 ? match[1] : null;
  }


  function getSpecificLines(text, lineNumbers) {
    const lines = text.split(/\r?\n/);
    const result = {};

    lineNumbers.forEach(lineNumber => {
      const index = lineNumber - 1;
      result[lineNumber] = index >= 0 && index < lines.length ? lines[index].trim() : "";
    });

    return result;
  }

  function extractQuotedString(inputString) {
    const regex = /\["(.*?)"\]/;
    const match = inputString.match(regex);
    return match && match.length > 1 ? match[1] : "";
  }

  function joinPlayersById(players_simplify, players_traditional) {
    if (!players_simplify || !players_traditional) {
      return [];
    }

    const traditionalMap = new Map();
    players_traditional.forEach(player => {
      traditionalMap.set(player.id, player);
    });


    const joinedArray = players_simplify
      .map(player1 => {
        // Tìm đối tượng player tương ứng trong simplifyMap
        const player2 = traditionalMap.get(player1.id);
        const traditional_name = player2 ? player2.chinese_name : player1.chinese_name;

        return {
          id: player1.id,
          english_name: player1.english_name,
          country: player1.country,
          chinese_traditional: traditional_name,
          chinese_simplified: player1.chinese_name,
        };
      })

    return joinedArray;
  }

  async function getPlayersFromStorage() {
    const result = await chrome.storage.local.get(["Soccer7m"]);
    return result.Soccer7m || [];
  }

  async function pushLiveTennisDataToServer() {
    try {
      disableAllButtons();
      showStatus("Pushing data to server...");
      const players = await getPlayersFromStorage();
      /*
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
      */
      showStatus("Successfully pushed data to server!");
    } catch (error) {
      showStatus("Error pushing matches: " + error.message, true);
      console.error("Error:", error);
    } finally {
      enableAllButtons();
    }
  }
});
