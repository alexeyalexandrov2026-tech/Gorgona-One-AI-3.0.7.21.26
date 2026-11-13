package com.miamielio.app.web

import android.webkit.WebViewClient

/** Why a page could not be shown. */
data class LoadFailure(val url: String?, val isOffline: Boolean) {
    companion object {
        private val offlineCodes = setOf(
            WebViewClient.ERROR_HOST_LOOKUP,
            WebViewClient.ERROR_CONNECT,
            WebViewClient.ERROR_TIMEOUT,
            WebViewClient.ERROR_IO,
        )
        private val offlineNames = listOf(
            "ERR_INTERNET_DISCONNECTED", "ERR_NAME_NOT_RESOLVED", "ERR_ADDRESS_UNREACHABLE",
            "ERR_NETWORK_CHANGED", "ERR_CONNECTION_", "ERR_TIMED_OUT", "ERR_PROXY_CONNECTION_FAILED",
        )

        /**
         * What a failed main-page load means for the guest. `code` is one of
         * `WebViewClient.ERROR_*`, `description` the engine's own name for it
         * ("net::ERR_INTERNET_DISCONNECTED"). Null when it is not a failure
         * at all: a navigation this app cancelled or replaced.
         */
        fun from(url: String?, code: Int, description: String?): LoadFailure? {
            val name = description.orEmpty()
            if (name.contains("ERR_ABORTED")) return null
            val offline = code in offlineCodes || offlineNames.any(name::contains)
            return LoadFailure(url, offline)
        }
    }
}
