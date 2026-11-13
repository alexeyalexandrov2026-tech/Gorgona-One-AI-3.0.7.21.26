package com.miamielio.app.app

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Whether the phone has a way to the internet, as the system sees it. A
 * screen that told the guest "no internet connection" asks again by itself
 * once a connection is back, instead of waiting for a tap.
 */
class Connectivity(context: Context) {
    private val manager: ConnectivityManager? = context.getSystemService(ConnectivityManager::class.java)
    private val mutableOnline = MutableStateFlow(currentlyOnline())

    /** Changes on the system's own thread; collectors see it on theirs. */
    val online: StateFlow<Boolean> = mutableOnline.asStateFlow()

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
            mutableOnline.value = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        }

        override fun onLost(network: Network) {
            mutableOnline.value = false
        }
    }

    init {
        // Without the system service (it is always there on a phone) the app
        // simply never hears that a connection came back.
        runCatching { manager?.registerDefaultNetworkCallback(callback) }
    }

    fun close() {
        runCatching { manager?.unregisterNetworkCallback(callback) }
    }

    private fun currentlyOnline(): Boolean {
        val network = manager?.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
