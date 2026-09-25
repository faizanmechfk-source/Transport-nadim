# Android WebView Integration Guide for Transport Entry

This web application is fully optimized for **Android 10+ WebView** wrappers (such as Jetpack Compose WebView, Capacitor, Cordova, or standard Android Studio Java/Kotlin `android.webkit.WebView`).

## Key WebView Features Integrated:
1. **Responsive Viewport**: Configured with `user-scalable=no, maximum-scale=1.0` in `index.html`.
2. **Back Button Handling**: The app registers `window.onpopstate` and integrates with `window.AndroidInterface.exitApp()`.
3. **Local Storage & Offline**: Uses IndexedDB with full local offline persistence.
4. **Print / PDF Generation**: Triggered via `window.print()` or `PdfService.generateBiltyPdf()` which downloads directly into the Android download manager.
5. **No Unnecessary Permissions**: Only basic network state and local storage.

## Kotlin Android Studio WebView Activity Sample:
```kotlin
package com.transportentry.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        // Bridge JS interface to Android
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidInterface")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }
        }

        webView.loadUrl("https://ais-dev-6sfbdwhtag7z7ebmqntokk-418055855736.asia-east1.run.app")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    class WebAppInterface(private val activity: MainActivity) {
        @JavascriptInterface
        fun showToast(message: String) {
            Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
        }

        @JavascriptInterface
        fun exitApp() {
            activity.finish()
        }
    }
}
```
