//const liveTennisServerUrl = "https://ops-api.nexdev.net/api/Tennis/live-tennis";
const soccer7mServerUrl = "http://localhost:5000/api/Tennis/soccer-7m";
const basketball7mServerUrl = "http://localhost:5000/api/Tennis/basketball-7m";


$(document).ready(function () {

  $("#soccer-crawl-btn").on("click", async function () {
    try {
      disableAllButtons('soccer');

      await queryAllSoccerPlayers();
      await pushSoccerToServer();
      showStatus('soccer',
        `Successfully queried all soccer data.`
      );
    } catch (err) {
      showStatus('soccer', "Error query soccer data: " + err.message, true);
    } finally {
      enableAllButtons('soccer');
    }
  });

  $("#soccer-push-btn").on("click", async function () {
    try {
      disableAllButtons('soccer');
      await pushSoccerToServer();
    } catch (err) {
      showStatus('soccer', "Error push data: " + err.message, true);
    } finally {
      enableAllButtons('soccer');
    }
  });


  $("#basketball-crawl-btn").on("click", async function () {
    try {
      disableAllButtons('basketball');
      await queryAllBasketballPlayers();

      await pushBasketballToServer();
      showStatus('basketball',
        `Successfully queried all basketball data.`
      );
    } catch (err) {
      showStatus('basketball', "Error query basketball data: " + err.message, true);
    } finally {
      enableAllButtons('basketball');
    }
  });

  $("#basketball-push-btn").on("click", async function () {
    try {
      disableAllButtons('basketball');
      await pushBasketballToServer();
    } catch (err) {
      showStatus('basketball', "Error push data: " + err.message, true);
    } finally {
      enableAllButtons('basketball');
    }
  });

  async function queryAllSoccerPlayers() {
    const { minPlayerId, maxPlayerId } = getPlayerIdRange('soccer');
    for (let i = minPlayerId; i <= maxPlayerId; i += 1000) {
      const players = await queryAllPlayers('soccer', i, i + 999);
      await setPlayersToStorage('soccer', players);
    }
  }

  async function queryAllBasketballPlayers() {
    const { minPlayerId, maxPlayerId } = getPlayerIdRange('basketball');
    for (let i = minPlayerId; i <= maxPlayerId; i += 1000) {
      const players = await queryAllPlayers('basketball', i, i + 999);
      await setPlayersToStorage('basketball', players);
    }
  }

  async function queryAllPlayers(sport, fromId, toId) {
    const playersFromStorage = await getPlayersFromStorage(sport);
    const playerIds = playersFromStorage.map(player => player.id);
    const playerIdSet = new Set(playerIds);

    let players = [];
    for (let i = fromId; i <= toId; i++) {

      if (playerIdSet.has(i)) {
        continue;
      }

      const simplified_player = await queryPlayer(sport, i, 'gb');
      if (!simplified_player || !simplified_player.english_name) {
        showStatus(sport, `No simplified player found for id: ${i}`);
        console.log(`No simplified player found for id: ${i}`);
        continue;
      }

      const traditional_player = await queryPlayer(sport, i, 'big');
      if (!traditional_player || !traditional_player.english_name) {
        showStatus(sport, `No traditional player found for id: ${i}`);
        console.log(`No traditional player found for id: ${i}`);
        continue;
      }

      const player = joinPlayer(simplified_player, traditional_player);
      if (player) {
        players.push(player);
      }

      showStatus(sport, `Queried ${players.length} of ${fromId} to ${toId} players. Current index: ${i}`);
    }

    players = playersFromStorage.concat(players);
    players = players.sort((a, b) => a.id - b.id);

    return players;
  }

  function getPlayerIdRange(sport) {
    if (sport === 'soccer') {
      return { minPlayerId: 1, maxPlayerId: 26 * 1000 };
    } else {
      return { minPlayerId: 1, maxPlayerId: 55 * 1000 };
    }
  }

  async function queryPlayer(sport, id, language) {
    try {
      const url = getPlayerUrl(sport, id, language);

      const response = await fetch(url);
      const htmlString = await response.text();
      const player = parsePlayerName(htmlString);

      return player ? { id, ...player } : null;
    }
    catch (err) {
      showStatus(sport, "Error query player: " + err.message, true);
      return null;
    }
  }

  function getPlayerUrl(sport, id, language) {
    if (sport === 'soccer') {
      return language === 'big'
        ? `https://team.7m.com.cn/${id}/index.shtml`
        : `https://team.7m.com.cn/${id}/index_gb.shtml`;
    } else {
      return language === 'big'
        ? `https://bdata.7m.com.cn/basketball_team_data/${id}/big/index.shtml`
        : `https://bdata.7m.com.cn/basketball_team_data/${id}/gb/index.shtml`;
    }
  }


  function parsePlayerName(htmlInput) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlInput, 'text/html');
    const titleElement = doc.querySelector('title');

    if (!titleElement) {
      return null;
    }

    const titleText = titleElement.textContent.trim();

    return parsePlayerNameFromText(titleText);
  }

  function parsePlayerNameFromText(titleText) {
      
    const regex = /^(.*?)\((.*?)\)/;
    const match = titleText.match(regex);

    if (match && match.length >= 3) {
      const chineseName = match[1].trim();
      const englishName = match[2].trim();

      return {
        english_name: englishName,
        chinese_name: chineseName
      };
    }

    return null;
  }


  function joinPlayer(simplified_player, traditional_player) {
    if (!simplified_player || !traditional_player) {
      return null;
    }

    if (simplified_player.english_name == simplified_player.chinese_name
      && simplified_player.english_name == traditional_player.chinese_name) {
      return null;
    }
    return {
      id: simplified_player.id,
      english_name: simplified_player.english_name,
      traditional_name: traditional_player.chinese_name,
      simplified_name: simplified_player.chinese_name,
    };
  }

  async function getPlayersFromStorage(sport) {
    if (sport === 'soccer') {
      return await getSoccerPlayersFromStorage();
    } else {
      return await getBasketballPlayersFromStorage();
    }
  }

  async function getSoccerPlayersFromStorage() {
    const result = await chrome.storage.local.get(["Soccer7m"]);
    return result.Soccer7m || [];
  }

  async function getBasketballPlayersFromStorage() {
    const result = await chrome.storage.local.get(["Basketball7m"]);
    return result.Basketball7m || [];
  }

  async function setSoccerPlayersToStorage(players) {
    await chrome.storage.local.set({
      Soccer7m: players,
    });
  }

  async function setBasketballPlayersToStorage(players) {
    await chrome.storage.local.set({
      Basketball7m: players,
    });
  }

  async function setPlayersToStorage(sport, players) {
    if (sport === 'soccer') {
      return await setSoccerPlayersToStorage(players);
    } else {
      return await setBasketballPlayersToStorage(players);
    }
  }

  async function pushSoccerToServer() {
    try {
      disableAllButtons('soccer');
      showStatus('soccer', "Pushing soccer data to server...");
      const players = await getSoccerPlayersFromStorage();

      const response = await fetch(soccer7mServerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(players),
      });

      if (!response.ok) {
        throw new Error("Failed to push matches");
      }

      showStatus('soccer', "Successfully pushed soccer data to server!");
    } catch (error) {
      showStatus('soccer', "Error pushing soccer data to server: " + error.message, true);
      console.error("Error:", error);
    } finally {
      enableAllButtons('soccer');
    }
  }

  async function pushBasketballToServer() {
    try {
      disableAllButtons('soccer');
      showStatus('basketball', "Pushing basketball data to server...");
      const players = await getBasketballPlayersFromStorage();

      const response = await fetch(basketball7mServerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(players),
      });

      if (!response.ok) {
        throw new Error("Failed to push matches");
      }

      showStatus('basketball', "Successfully pushed basketball data to server!");
    } catch (error) {
      showStatus('basketball', "Error pushing basketball data to server: " + error.message, true);
      console.error("Error:", error);
    } finally {
      enableAllButtons('soccer');
    }
  }
});
