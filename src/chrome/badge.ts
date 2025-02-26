import type { BadgeDisplayService, Badge } from '../infra/badge'

export class ChromeBadgeDisplayService implements BadgeDisplayService {
  displayBadge(badge: Badge) {
    chrome.action.setBadgeText({ text: badge.text })
    chrome.action.setBadgeBackgroundColor({ color: badge.color.backgroundColor })
    chrome.action.setBadgeTextColor({ color: badge.color.textColor })
  }

  clearBadge() {
    chrome.action.setBadgeText({ text: '' })
  }
}
