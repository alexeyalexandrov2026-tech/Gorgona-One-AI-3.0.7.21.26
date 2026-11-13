import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

// Where each build's content lives. Debug talks to a test deployment over
// HTTPS, release to the production site. Either can be pointed elsewhere:
//   ./gradlew assembleDebug -Pmiamielio.debugBaseUrl=https://example.test
val debugBaseUrl = providers.gradleProperty("miamielio.debugBaseUrl")
    .getOrElse("https://claude-miami-elio-app-home-twt06c-gorgonaoneai3072126.alexey-alexandrov2026.workers.dev")
val releaseBaseUrl = providers.gradleProperty("miamielio.releaseBaseUrl")
    .getOrElse("https://gorgona-one.com")

// Where "Report this answer" is sent on the site. Empty hides the action:
//   ./gradlew bundleRelease -Pmiamielio.reportPath=
val reportPath = providers.gradleProperty("miamielio.reportPath").getOrElse("/api/chat/report")

// Release signing is read from android/keystore.properties (never committed)
// or from environment variables in CI. Without either, the release bundle is
// built unsigned.
val keystoreFile = rootProject.file("keystore.properties")
val keystore = Properties().apply {
    if (keystoreFile.exists()) keystoreFile.inputStream().use { load(it) }
}
fun signing(name: String, env: String): String? =
    keystore.getProperty(name) ?: System.getenv(env)

android {
    namespace = "com.miamielio.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.miamielio.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "REPORT_PATH", "\"$reportPath\"")
    }

    signingConfigs {
        val storePath = signing("storeFile", "MIAMIELIO_KEYSTORE_FILE")
        if (storePath != null) {
            create("release") {
                storeFile = rootProject.file(storePath)
                storePassword = signing("storePassword", "MIAMIELIO_KEYSTORE_PASSWORD")
                keyAlias = signing("keyAlias", "MIAMIELIO_KEY_ALIAS")
                keyPassword = signing("keyPassword", "MIAMIELIO_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            manifestPlaceholders["appLabel"] = "Miami Elio Test"
            buildConfigField("String", "BASE_URL", "\"$debugBaseUrl\"")
            buildConfigField("String", "ADDITIONAL_HOSTS", "\"\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            manifestPlaceholders["appLabel"] = "Miami Elio"
            buildConfigField("String", "BASE_URL", "\"$releaseBaseUrl\"")
            buildConfigField("String", "ADDITIONAL_HOSTS", "\"www.gorgona-one.com\"")
            signingConfig = signingConfigs.findByName("release")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    // Lists the app's 16 languages for Android 13+, so the guest can pick the
    // app's language in the phone's settings (see res/resources.properties).
    androidResources {
        generateLocaleConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }

    lint {
        warningsAsErrors = false
        abortOnError = true
        checkDependencies = true
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.webkit)
    implementation(libs.androidx.browser)
    implementation(libs.androidx.swiperefreshlayout)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)
    implementation(libs.okhttp)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(platform(libs.compose.bom))
    testImplementation(libs.compose.ui.test.junit4)
    debugImplementation(libs.compose.ui.test.manifest)
}
