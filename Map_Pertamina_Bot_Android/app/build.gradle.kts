plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.mapbot.pertamina"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mapbot.pertamina"
        minSdk = 26
        targetSdk = 35
        versionCode = 19
        versionName = "1.1.9"

        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("debug")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
}

dependencies {
    // === Core Android ===
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.1")

    // === Jetpack Compose UI ===
    implementation(platform("androidx.compose:compose-bom:2024.08.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // === WebView ===
    implementation("androidx.webkit:webkit:1.11.0")

    // === OpenCV Android SDK ===
    implementation("org.opencv:opencv:4.9.0")

    // === Excel Reader ===
    implementation("org.apache.poi:poi:5.2.5")
    implementation("org.apache.poi:poi-ooxml:5.2.5")
    implementation("org.apache.poi:poi-ooxml-lite:5.2.5")
    implementation("org.apache.xmlbeans:xmlbeans:5.2.0")

    // === Encrypted Storage ===
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // === Coroutines ===
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // === OkHttp for API Calls ===
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // === Chrome Custom Tabs (mengganti Midtrans UiKit SDK) ===
    // Lebih reliable — langsung buka halaman pembayaran Midtrans di browser
    implementation("androidx.browser:browser:1.8.0")

    // === Lifecycle (untuk onResume detection setelah payment) ===
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.4")

    // === Google Fonts (Inter) ===
    implementation("androidx.compose.ui:ui-text-google-fonts:1.6.8")
}




