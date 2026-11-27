package com.miamielio.app.app

import java.net.URLEncoder

/**
 * Direct Miami Elio team contact channels, matching `lib/managerContact.mjs`
 * on the live website: WhatsApp Business, official Telegram (@MIAMI_ELIO),
 * and the Miami US business phone line (+1 786-492-8880).
 */
object ManagerContact {
    const val TELEGRAM_URL = "https://t.me/MIAMI_ELIO"
    const val WHATSAPP_URL = "https://wa.me/message/VO7GCPZCDKRZO1"
    const val WHATSAPP_HANDOFF_BASE = "https://wa.me/17864928880"
    const val PHONE_DISPLAY = "+1 786-492-8880"
    const val PHONE_URL = "tel:+17864928880"

    /** Prefills WhatsApp with a short summary when handing off from AI chat. */
    fun whatsAppUrl(prefill: String? = null): String {
        val clean = prefill?.trim()?.take(400).orEmpty()
        if (clean.isEmpty()) return WHATSAPP_URL
        val encoded = URLEncoder.encode(clean, "UTF-8").replace("+", "%20")
        return "$WHATSAPP_HANDOFF_BASE?text=$encoded"
    }
}

/** Official Miami Elio Telegram channel (never a personal handle). */
const val LIVE_MANAGER_URL = ManagerContact.TELEGRAM_URL
