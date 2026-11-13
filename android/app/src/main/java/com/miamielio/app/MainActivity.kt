package com.miamielio.app

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import com.miamielio.app.app.AppServices
import com.miamielio.app.ui.AppRoot
import com.miamielio.app.ui.MiamiElioTheme
import com.miamielio.app.web.WebHost

class MainActivity : ComponentActivity(), WebHost {
    internal lateinit var services: AppServices
        private set

    private var pendingFiles: ((Array<Uri>?) -> Unit)? = null
    private val filePicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val answer = pendingFiles
        pendingFiles = null
        answer?.invoke(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
    }

    private var pendingMicrophone: ((Boolean) -> Unit)? = null
    private val microphonePrompt = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        val answer = pendingMicrophone
        pendingMicrophone = null
        answer?.invoke(granted)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // One appearance, dark: light icons in both system bars, always.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        services = AppServices(activity = this, host = this)
        // A link that started the app. Not on a restart: it was followed already.
        if (savedInstanceState == null) follow(intent)
        setContent { MiamiElioTheme { AppRoot(services) } }
    }

    public override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        follow(intent)
    }

    override fun onResume() {
        super.onResume()
        services.onResume()
    }

    override fun onPause() {
        services.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        // A page still waiting for an answer gets "nothing chosen".
        pendingFiles?.invoke(null)
        pendingFiles = null
        pendingMicrophone?.invoke(false)
        pendingMicrophone = null
        services.destroy()
        super.onDestroy()
    }

    /** `miamielio://open?path=/yachts`, `miamielio://concierge`, `miamielio://search`, `miamielio://account`. */
    private fun follow(intent: Intent?) {
        if (intent?.action != Intent.ACTION_VIEW) return
        intent.dataString?.let(services.router::handle)
    }

    // --- What a page may ask for ---

    override fun chooseFiles(intent: Intent, result: (Array<Uri>?) -> Unit) {
        // One chooser at a time: the earlier page is told nothing was chosen.
        pendingFiles?.invoke(null)
        pendingFiles = result
        try {
            filePicker.launch(intent)
        } catch (_: ActivityNotFoundException) {
            pendingFiles = null
            result(null)
        }
    }

    override fun requestMicrophone(result: (Boolean) -> Unit) {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            result(true)
            return
        }
        pendingMicrophone?.invoke(false)
        pendingMicrophone = result
        microphonePrompt.launch(Manifest.permission.RECORD_AUDIO)
    }
}
