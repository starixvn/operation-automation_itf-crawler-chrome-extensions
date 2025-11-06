//const liveTennisServerUrl = "https://ops-api.nexdev.net/api/Tennis/live-tennis";

$(document).ready(function () {
  const cookieString = "cbo_click_cookie_49bff9e89f952072a225be526afdd430=1762395417; rcKA_379b_saltkey=rRCVzOwn; rcKA_379b_lastvisit=1762396973; rcKA_379b_viewid=tid_1868603; rcKA_379b_sendmail=1; rcKA_379b_seccode=1453.89517a73e59c39d096; rcKA_379b_ulastactivity=1762422973%7C0; rcKA_379b_auth=aa33GDADS4ra2ReHkgJSWDXSjkMTsovxGSJUc59p1xFLUQQQ0RsugBubpxGKVKkxyScMDQTPNkuw53LWd2qCLPGFVD%2F%2B; rcKA_379b_lastcheckfeed=3132168%7C1762422973; rcKA_379b_checkfollow=1; rcKA_379b_lip=Manual+Acting%2C1762419330; rcKA_379b_myrepeat_rr=R0; cbo_auth=1e9bFa1Pd0zg%2B%2FfcsTs32hku56yJLKOGIo5kDNsgATHPXIDqvIhzyeJdR9wp%2FQ; oms_auth=35f2tagWwMR5Va%2FmUsTEcE2mbZ7DPeoTlpmOLq9pQDmXWlSgVnw3RLW5SA7Hjw; rcKA_379b_lastact=1762422978%09api.php%09js; userLoginJudge3132168=y";

  $("#badminton-detail-crawl-btn").on("click", async function () {
    try {
      disableAllButtons('badminton-detail');
      setMultipleCookies(cookieString);
      await crawlAllPlayers();
      await pushBadmintonToServer();
      showStatus('badminton', "Successfully crawled all data.");
    } catch (err) {
      showStatus('badminton', "Error crawl data: " + err.message, true);
    }
    finally {
      enableAllButtons('badminton-detail');
    }
  });

  async function crawlAllPlayers() {
    const offset = 100;
    const maxId = 55000;
    let fromId = 1;

    while (fromId <= maxId) {
      await crawlPlayers(fromId, offset);
      fromId += offset;
    }
  }


  async function crawlPlayers(fromId, offset) {
    const playerCheckpoint = await getBadmintonPlayerCheckpoint();
    const players = [];
    for (let i = fromId; i < fromId + offset; i++) {
      if (i <= playerCheckpoint) {
        continue;
      }
      const player = await crawlDetailPlayer(i);
      if (player) {
        players.push(player);
      }

      await sleep(3000);
    }

    await setBadmintonPlayerCheckpoint(fromId + offset - 1);

    const playersFromStorage = await getPlayersFromStorage();
    const playerIdSet = new Set(playersFromStorage.map(player => player.id));
    const newPlayers = players.filter(player => !playerIdSet.has(player.id));
    const allPlayers = playersFromStorage.concat(newPlayers).sort((a, b) => a.id - b.id);
    await setPlayersToStorage(allPlayers);
  }

  async function crawlDetailPlayer(playerId) {
    const url = `https://www.badmintoncn.com/cbo_star/star_view.php?sid=${playerId}`;
    const htmlString = await fetchChineseSite(url);

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const column = doc.querySelector('.view_show'); 
    
    if (!column) {
        showStatus('badminton-detail', `Container column not found for id: ${playerId}`);
        return null;
    }

    const chineseNameElement = column.querySelector('strong');     
    const englishNameElement = column.querySelector('.graytext'); 

    if (chineseNameElement && englishNameElement) {
        const chineseName = chineseNameElement.textContent.trim();
        const englishName = englishNameElement.textContent.trim(); 

        showStatus('badminton-detail', `Crawled player: ${playerId} - ${chineseName} - ${englishName}`);
        
        return {
            id: playerId,
            chinese_name: chineseName,
            english_name: englishName
        };
    } else {
        showStatus('badminton-detail', `No player name elements found in column for id: ${playerId}`);
        return null;
    }
}

  async function fetchChineseSite(url) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('gbk');
    const htmlContent = decoder.decode(buffer);
    return htmlContent;
  }


  async function getPlayersFromStorage() {
    const players = await chrome.storage.local.get('Badminton');
    return players.Badminton || [];
  }

  async function setPlayersToStorage(players) {
    await chrome.storage.local.set({
      Badminton: players,
    });
  }

  async function getBadmintonPlayerCheckpoint() {
    const checkpoint = await chrome.storage.local.get('BadmintonPlayerCheckpoint');
    return checkpoint.BadmintonPlayerCheckpoint || -1;
  }

  async function setBadmintonPlayerCheckpoint(checkpoint) {
    await chrome.storage.local.set({
      BadmintonPlayerCheckpoint: checkpoint,
    });
  }

  function setMultipleCookies(cookieString) {
    const cookiePairs = cookieString.split('; ');
    const domain = ".badmintoncn.com";
    const cookieAttributes = `; Domain=${domain}; Path=/`;
    cookiePairs.forEach(pair => {
      if (pair) {
        const parts = pair.match(/^([^=]+)=(.+)$/);

        if (parts && parts.length === 3) {
          const name = parts[1];
          let value = parts[2];
          document.cookie = `${name}=${value}${cookieAttributes}`;
        }
      }
    });
  }

});
