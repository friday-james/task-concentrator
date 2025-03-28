import { BackgroundListener } from './listener'
import { BrowsingControlTogglingService } from '../domain/browsing_control_toggling'
import { ChromeNewTabService } from '../chrome/new_tab'

// Noted that e2e tests are hard to cover all of the below related to chrome api properly. Better use a bit manual testing if needed.

const redirectTogglingService = BrowsingControlTogglingService.create()

chrome.alarms.onAlarm.addListener((alarm) => {
  console.debug('Alarm fired:', alarm)
  redirectTogglingService.run()
})
chrome.alarms.create({ periodInMinutes: 0.5, when: Date.now() })

BackgroundListener.create().start()

chrome.runtime.onStartup.addListener(function () {}) // This is a hack to keep the above run immediately after the browser is closed and reopened

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'open-statistics-page',
    title: 'Statistics',
    contexts: ['action']
  })
})

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-statistics-page') {
    new ChromeNewTabService(chrome.runtime.getURL('options.html') + '#/statistics').trigger()
  }
})
