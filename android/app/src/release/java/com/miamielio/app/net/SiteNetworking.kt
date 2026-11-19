package com.miamielio.app.net

import android.content.Context
import com.miamielio.app.core.AppConfig
import okhttp3.OkHttpClient

@Suppress("UNUSED_PARAMETER")
internal fun siteHttpClient(context: Context, config: AppConfig): OkHttpClient =
    OkHttpTransport.sharedClient
