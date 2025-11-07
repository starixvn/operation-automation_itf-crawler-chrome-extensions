//const liveTennisServerUrl = "https://ops-api.nexdev.net/api/Tennis/live-tennis";
const badmintonrverUrl = "http://localhost:5000/api/Tennis/badminton";


$(document).ready(function () {
  const cookieString = "cbo_click_cookie_49bff9e89f952072a225be526afdd430=1762395417; rcKA_379b_saltkey=rRCVzOwn; rcKA_379b_lastvisit=1762396973; rcKA_379b_viewid=tid_1868603; rcKA_379b_sendmail=1; rcKA_379b_seccode=1453.89517a73e59c39d096; rcKA_379b_ulastactivity=1762422973%7C0; rcKA_379b_auth=aa33GDADS4ra2ReHkgJSWDXSjkMTsovxGSJUc59p1xFLUQQQ0RsugBubpxGKVKkxyScMDQTPNkuw53LWd2qCLPGFVD%2F%2B; rcKA_379b_lastcheckfeed=3132168%7C1762422973; rcKA_379b_checkfollow=1; rcKA_379b_lip=Manual+Acting%2C1762419330; rcKA_379b_myrepeat_rr=R0; cbo_auth=1e9bFa1Pd0zg%2B%2FfcsTs32hku56yJLKOGIo5kDNsgATHPXIDqvIhzyeJdR9wp%2FQ; oms_auth=35f2tagWwMR5Va%2FmUsTEcE2mbZ7DPeoTlpmOLq9pQDmXWlSgVnw3RLW5SA7Hjw; rcKA_379b_lastact=1762422978%09api.php%09js; userLoginJudge3132168=y";

  $("#badminton-crawl-btn").on("click", async function () {
    try {
      disableAllButtons('badminton');
      setMultipleCookies(cookieString);
      await crawlAllPlayers();
      await pushBadmintonToServer();
      showStatus('badminton', "Successfully crawled all data.");
    } catch (err) {
      showStatus('badminton', "Error crawl data: " + err.message, true);
    }
    finally {
      enableAllButtons('badminton');
    }
  });

  $("#badminton-push-btn").on("click", async function () {
    try {
      disableAllButtons('badminton');
      await pushBadmintonToServer();
    } catch (err) {
      showStatus('badminton', "Error push data: " + err.message, true);
    }
    finally {
      enableAllButtons('badminton');
    }
  });

  async function crawlAllPlayers() {
    for (let i = 0; i < badmintonCountryCodes.length; i++) {
      const checkpoint = await getBadmintonCheckpoint();
      if (i <= checkpoint) {
        continue;
      }
      await crawlAllPages(badmintonCountryCodes[i]);
      await setBadmintonCheckpoint(i);
      showStatus('badminton', "Successfully crawled data for country code: " + badmintonCountryCodes[i]);
    }
  }

  async function crawlAllPages(countryCode) {
    for (let i = 1; i <= 50; i++) {
      const players = await crawlPage(i, countryCode);
      if (players.length === 0) {
        break;
      }
      await sleep(3000);
      const playersFromStorage = await getPlayersFromStorage();
      const playerIds = playersFromStorage.map(player => player.id);
      const playerIdSet = new Set(playerIds);
      const newPlayers = players.filter(player => !playerIdSet.has(player.id));
      const allPlayers = playersFromStorage.concat(newPlayers).sort((a, b) => a.id - b.id);

      await setPlayersToStorage(allPlayers);
    }
  }

  async function crawlPage(page, countryCode) {
    const url = `https://www.badmintoncn.com/cbo_star/list.php?sname=&scid=${countryCode}&sxm=&isretired=1&page=${page}`;
    const html = await fetchChineseSite(url);    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');    
    const columnsNodeList = doc.querySelectorAll('table.table td');
    const columns = [...columnsNodeList];
    const players = columns.map(col => {
      const anchor = col.querySelector('a');
      if(!anchor) {
        return null;
      }

      const id = anchor.href.split('=')[1];
      const chineseNameElement = anchor.querySelector('strong');
      const chinese_name = chineseNameElement ? chineseNameElement.textContent.trim() : "";

      const englishNameElement = anchor.querySelector('span.smalltext.graytext');
      const english_name = englishNameElement ? englishNameElement.textContent.trim() : "";

      return {
        id: parseInt(id),
        english_name,
        simplified_name: chinese_name,        
      };
    });

    const nonNullPlayers = players.filter(player => player !== null);
    if(nonNullPlayers.length === 0) {
      console.log(`No players found for url ${url}`);      
    }

    return nonNullPlayers;
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

  async function getBadmintonCheckpoint() {
    const checkpoint = await chrome.storage.local.get('BadmintonCheckpoint');
    return checkpoint.BadmintonCheckpoint || -1;
  }

  async function setBadmintonCheckpoint(checkpoint) {
    await chrome.storage.local.set({
      BadmintonCheckpoint: checkpoint,
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

  async function pushBadmintonToServer() {
    try {
      disableAllButtons('badminton');
      showStatus('badminton', "Pushing badminton data to server...");
      
    } catch (err) {
      showStatus('badminton', "Error push data: " + err.message, true);
    }
    finally {
      enableAllButtons('badminton');
    }
  }
});
