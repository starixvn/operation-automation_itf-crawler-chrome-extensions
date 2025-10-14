// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCrawl') {
    crawlData().then(data => {
      sendResponse({ success: true, data: data });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Required for async response
  }
  
  if (request.action === 'crawlLeague') {
    crawlLeagueData(request.month, request.year).then(data => {
      sendResponse({ success: true, data: data });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

async function crawlData() {
  try {
    // Wait for the page to be fully loaded
    await waitForElement('.tournament-list');
    
    const tournaments = [];
    const tournamentElements = document.querySelectorAll('.tournament-item');

    for (const element of tournamentElements) {
      const tournament = {
        name: getTournamentName(element),
        date: getTournamentDate(element),
        location: getTournamentLocation(element),
        category: getTournamentCategory(element),
        surface: getTournamentSurface(element),
        prize: getTournamentPrize(element)
      };
      tournaments.push(tournament);
    }

    return tournaments;
  } catch (error) {
    console.error('Error crawling data:', error);
    throw error;
  }
}

function waitForElement(selector) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve();
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timeout waiting for element'));
    }, 10000);
  });
}

function getTournamentName(element) {
  const nameElement = element.querySelector('.tournament-name');
  return nameElement ? nameElement.textContent.trim() : '';
}

function getTournamentDate(element) {
  const dateElement = element.querySelector('.tournament-date');
  return dateElement ? dateElement.textContent.trim() : '';
}

function getTournamentLocation(element) {
  const locationElement = element.querySelector('.tournament-location');
  return locationElement ? locationElement.textContent.trim() : '';
}

function getTournamentCategory(element) {
  const categoryElement = element.querySelector('.tournament-category');
  return categoryElement ? categoryElement.textContent.trim() : '';
}

function getTournamentSurface(element) {
  const surfaceElement = element.querySelector('.tournament-surface');
  return surfaceElement ? surfaceElement.textContent.trim() : '';
}

function getTournamentPrize(element) {
  const prizeElement = element.querySelector('.tournament-prize');
  return prizeElement ? prizeElement.textContent.trim() : '';
}

async function crawlLeagueData(month, year) {
  try {
    // Construct the URL for the specific month and year
    const url = `https://www.itftennis.com/en/tournament-calendar/${year}/${month}/`;
    
    // Navigate to the URL if we're not already there
    if (window.location.href !== url) {
      window.location.href = url;
      // Wait for navigation and page load
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Wait for the league list to be loaded
    await waitForElement('.tournament-list');
    
    const leagues = [];
    const leagueElements = document.querySelectorAll('.tournament-item');

    for (const element of leagueElements) {
      const league = {
        name: getTournamentName(element),
        date: getTournamentDate(element),
        location: getTournamentLocation(element),
        category: getTournamentCategory(element),
        surface: getTournamentSurface(element),
        prize: getTournamentPrize(element),
        month: month,
        year: year
      };
      leagues.push(league);
    }

    return leagues;
  } catch (error) {
    console.error('Error crawling league data:', error);
    throw error;
  }
}
